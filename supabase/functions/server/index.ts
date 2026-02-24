import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js";
const app = new Hono();

// Supabase client for auth verification
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Middleware to verify auth token
async function verifyAuth(c: any, next: any) {
  const accessToken = c.req.header('Authorization')?.split(' ')[1];

  if (!accessToken) {
    return c.json({ error: 'Unauthorized: No token provided' }, 401);
  }

  const { data: { user }, error } = await supabase.auth.getUser(accessToken);

  if (error || !user) {
    console.error('Authorization error:', error);
    return c.json({ error: 'Unauthorized: Invalid token' }, 401);
  }

  c.set('userId', user.id);
  c.set('user', user);
  await next();
}

// Health check endpoint
app.get("/make-server-3ed9c009/health", (c) => {
  return c.json({ status: "ok" });
});

// Get user profile
app.get("/make-server-3ed9c009/user/profile", verifyAuth, async (c) => {
  try {
    const authUserId = c.get('userId');

    // users 테이블에서 프로필 조회
    const { data: userRecord, error } = await supabase.from('users')
      .select('id, email, name, avatar_url, provider, church, created_at')
      .eq('auth_user_id', authUserId)
      .single();

    if (error || !userRecord) {
      console.error('User record not found:', error);
      return c.json({ error: 'User profile not found' }, 404);
    }

    // daily_credits에서 전체 크레딧 합계 조회
    const { data: allCredits } = await supabase.from('daily_credits')
      .select('credits_earned, credits_spent')
      .eq('user_id', userRecord.id);

    const totalEarned = allCredits?.reduce((sum, record) => sum + (record.credits_earned || 0), 0) || 0;
    const totalSpent = allCredits?.reduce((sum, record) => sum + (record.credits_spent || 0), 0) || 0;

    const { data: primaryMembership } = await supabase
      .from('user_church_memberships')
      .select('churches(name)')
      .eq('user_id', userRecord.id)
      .eq('is_primary', true)
      .maybeSingle();

    const primaryChurchName = primaryMembership?.churches?.name || userRecord.church || '';

    const profile = {
      userId: userRecord.id,
      email: userRecord.email,
      name: userRecord.name || 'User',
      avatarUrl: userRecord.avatar_url,
      provider: userRecord.provider,
      church: primaryChurchName,
      creditsEarned: totalEarned,
      creditsSpent: totalSpent,
      createdAt: userRecord.created_at,
    };

    return c.json({ profile });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return c.json({ error: 'Failed to fetch profile' }, 500);
  }
});

// Update user profile
app.post("/make-server-3ed9c009/user/profile", verifyAuth, async (c) => {
  try {
    const authUserId = c.get('userId');
    const body = await c.req.json();
    const { name, avatarUrl, church } = body;

    // users 테이블 업데이트
    const { data: updated, error } = await supabase.from('users')
      .update({
        name: name || undefined,
        avatar_url: avatarUrl || undefined,
        church: typeof church === 'string' ? church.trim() : undefined,
        updated_at: new Date().toISOString(),
      })
      .eq('auth_user_id', authUserId)
      .select()
      .single();

    if (error) throw error;

    return c.json({ profile: updated });
  } catch (error) {
    console.error('Error updating user profile:', error);
    return c.json({ error: 'Failed to update profile' }, 500);
  }
});


// Save transcription record and update credits
app.post("/make-server-3ed9c009/transcription", verifyAuth, async (c) => {
  try {
    const authUserId = c.get('userId');
    const body = await c.req.json();
    const { mode, verse, credits, book, chapter, verseNum, date: clientDate } = body;

    // 1. users 테이블에서 user_id 조회
    const { data: userRecord } = await supabase.from('users')
      .select('id')
      .eq('auth_user_id', authUserId)
      .single();

    if (!userRecord) {
      return c.json({ error: 'User not found' }, 404);
    }

    const userId = userRecord.id;
    // 클라이언트에서 보낸 날짜 사용, 없으면 UTC 날짜
    const date = clientDate || new Date().toISOString().split('T')[0];

    // 2. daily_credits에서 오늘 기록 조회
    const { data: existingCredit } = await supabase.from('daily_credits')
      .select('credits_earned')
      .eq('user_id', userId)
      .eq('date', date)
      .maybeSingle();

    const totalCreditsEarned = (existingCredit?.credits_earned || 0) + credits;

    // 3. daily_credits에 크레딧 추가/업데이트
    const { data: creditData, error: creditError } = await supabase.from('daily_credits')
      .upsert({
        user_id: userId,
        date: date,
        credits_earned: totalCreditsEarned,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,date' })
      .select('credits_earned')
      .single();

    if (creditError) {
      console.error('Error updating credits:', creditError);
      return c.json({ error: `Failed to update credits: ${creditError.message}` }, 500);
    }

    // 4. transcriptions_progress 업데이트 (마지막 필사 위치)
    // 먼저 기존 레코드 확인
    const { data: existingProgress } = await supabase.from('transcriptions_progress')
      .select('id')
      .eq('user_id', userId)
      .eq('book', book)
      .maybeSingle();

    if (existingProgress) {
      // 업데이트
      const { error: progressError } = await supabase.from('transcriptions_progress')
        .update({
          chapter,
          verse: verseNum,
          progress_json: { lastUpdated: new Date().toISOString(), mode },
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingProgress.id);

      if (progressError) {
        console.error('Error updating progress:', progressError);
        return c.json({ error: `Failed to update progress: ${progressError.message}` }, 500);
      }
    } else {
      // 신규 삽입
      const { error: progressError } = await supabase.from('transcriptions_progress')
        .insert({
          user_id: userId,
          book,
          chapter,
          verse: verseNum,
          progress_json: { lastUpdated: new Date().toISOString(), mode },
          updated_at: new Date().toISOString(),
        });

      if (progressError) {
        console.error('Error inserting progress:', progressError);
        return c.json({ error: `Failed to insert progress: ${progressError.message}` }, 500);
      }
    }

    return c.json({
      transcription: {
        credits,
        book,
        chapter,
        verseNum,
        date,
      },
      dailyEarned: creditData?.credits_earned || credits,
    });
  } catch (error) {
    console.error('Error saving transcription:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ error: `Failed to save transcription: ${errorMessage}` }, 500);
  }
});

// Get daily stats for a specific date or date range
app.get("/make-server-3ed9c009/daily-stats", verifyAuth, async (c) => {
  try {
    const authUserId = c.get('userId');
    const date = c.req.query('date'); // YYYY-MM-DD
    const month = c.req.query('month'); // YYYY-MM

    // 1. users 테이블에서 user_id 조회
    const { data: userRecord } = await supabase.from('users')
      .select('id')
      .eq('auth_user_id', authUserId)
      .single();

    if (!userRecord) {
      return c.json({ error: 'User not found' }, 404);
    }

    const userId = userRecord.id;

    if (date) {
      // Get single day stats
      const { data: stats, error } = await supabase.from('daily_credits')
        .select('*')
        .eq('user_id', userId)
        .eq('date', date)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return c.json({ date, stats: stats || { date, credits_earned: 0, credits_spent: 0 } });
    } else if (month) {
      // Get all days in month (YYYY-MM)
      // Calculate next month for proper date range
      const [year, monthNum] = month.split('-');
      const nextMonth = new Date(parseInt(year), parseInt(monthNum), 1);
      const nextMonthStr = nextMonth.toISOString().split('T')[0];

      const { data: monthStats, error } = await supabase.from('daily_credits')
        .select('*')
        .eq('user_id', userId)
        .gte('date', `${month}-01`)
        .lt('date', nextMonthStr);

      if (error) throw error;

      return c.json({ month, stats: monthStats || [] });
    } else {
      // Get today's stats
      const today = new Date().toISOString().split('T')[0];
      const { data: stats, error } = await supabase.from('daily_credits')
        .select('*')
        .eq('user_id', userId)
        .eq('date', today)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return c.json({ date: today, stats: stats || { date: today, credits_earned: 0, credits_spent: 0 } });
    }
  } catch (error) {
    console.error('Error fetching daily stats:', error);
    return c.json({ error: 'Failed to fetch daily stats' }, 500);
  }
});

// Get completed verses (for Bible tab marking)
app.get("/make-server-3ed9c009/completed-verses", verifyAuth, async (c) => {
  try {
    const authUserId = c.get('userId');
    console.log('Fetching completed verses for user:', authUserId);

    // 1. users 테이블에서 user_id 조회
    const { data: userRecord, error: userError } = await supabase.from('users')
      .select('id')
      .eq('auth_user_id', authUserId)
      .single();

    if (userError) {
      console.error('Error finding user:', userError);
      return c.json({ completedVerses: {} });
    }

    if (!userRecord) {
      console.log('User record not found for auth_user_id:', authUserId);
      return c.json({ completedVerses: {} });
    }

    console.log('Found user with id:', userRecord.id);

    // 2. transcriptions_progress 테이블에서 완료된 절 목록 조회
    const { data: progressData, error } = await supabase.from('transcriptions_progress')
      .select('book, chapter, verse')
      .eq('user_id', userRecord.id);

    if (error) {
      console.error('Error fetching progress data:', error);
      return c.json({ error: `Failed to fetch completed verses: ${error.message}` }, 500);
    }

    console.log('Found progress records:', progressData?.length || 0);

    // Create a map of completed verses: { "genesis-1-1": true, ... }
    const completedVerses: { [key: string]: boolean } = {};
    (progressData || []).forEach((p: any) => {
      if (p.book && p.chapter && p.verse) {
        const key = `${p.book}-${p.chapter}-${p.verse}`;
        completedVerses[key] = true;
      }
    });

    console.log('Completed verses map:', Object.keys(completedVerses).length, 'items');
    return c.json({ completedVerses });
  } catch (error) {
    console.error('Error fetching completed verses:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ error: `Failed to fetch completed verses: ${errorMessage}` }, 500);
  }
});

// ===================================
// 소셜로그인 연동 API
// ===================================

// GET /make-server-3ed9c009/user/providers - 사용자의 소셜 계정 정보 조회
app.get("/make-server-3ed9c009/user/providers", verifyAuth, async (c) => {
  try {
    const authUserId = c.get('userId');

    const { data: userRecord, error } = await supabase.from('users')
      .select('id, provider, email, name')
      .eq('auth_user_id', authUserId)
      .single();

    if (error || !userRecord) {
      return c.json({ error: 'User not found' }, 404);
    }

    // 현재 로그인한 provider 반환
    const providers = userRecord.provider ? [
      {
        id: `${userRecord.id}-${userRecord.provider}`,
        provider: userRecord.provider,
        email: userRecord.email,
        name: userRecord.name,
        linked_at: new Date().toISOString(), // users 테이블에 created_at이 있으면 사용
      }
    ] : [];

    return c.json({ providers });
  } catch (error) {
    console.error('Error fetching user providers:', error);
    return c.json({ error: 'Failed to fetch providers' }, 500);
  }
});

// POST /make-server-3ed9c009/user/providers/link - 소셜 계정 연동
// Body: { provider, provider_name, provider_email }
app.post("/make-server-3ed9c009/user/providers/link", verifyAuth, async (c) => {
  try {
    const authUserId = c.get('userId');
    const body = await c.req.json();
    const { provider, provider_name, provider_email } = body;

    if (!provider) {
      return c.json({ error: 'provider is required' }, 400);
    }

    // users 테이블의 provider 필드 업데이트
    const { data: updated, error } = await supabase.from('users')
      .update({
        provider,
        name: provider_name || undefined,
        email: provider_email || undefined,
        updated_at: new Date().toISOString(),
      })
      .eq('auth_user_id', authUserId)
      .select()
      .single();

    if (error) throw error;

    return c.json({ status: 'linked', provider: updated });
  } catch (error) {
    console.error('Error linking provider:', error);
    return c.json({ error: 'Failed to link provider' }, 500);
  }
});

// DELETE /make-server-3ed9c009/user/providers/:provider - 소셜 계정 연동 해제
app.delete("/make-server-3ed9c009/user/providers/:provider", verifyAuth, async (c) => {
  try {
    const authUserId = c.get('userId');
    const providerName = c.req.param('provider');

    // provider 필드 초기화
    const { data: updated, error } = await supabase.from('users')
      .update({
        provider: null,
        updated_at: new Date().toISOString(),
      })
      .eq('auth_user_id', authUserId)
      .select()
      .single();

    if (error) throw error;

    return c.json({ status: 'unlinked' });
  } catch (error) {
    console.error('Error unlinking provider:', error);
    return c.json({ error: 'Failed to unlink provider' }, 500);
  }
});

// POST /make-server-3ed9c009/user/providers/disconnect-all - 모든 소셜 계정 연동 해제
app.post("/make-server-3ed9c009/user/providers/disconnect-all", verifyAuth, async (c) => {
  try {
    const authUserId = c.get('userId');

    const { error } = await supabase.from('users')
      .update({
        provider: null,
        updated_at: new Date().toISOString(),
      })
      .eq('auth_user_id', authUserId);

    if (error) throw error;

    return c.json({ status: 'all_disconnected' });
  } catch (error) {
    console.error('Error disconnecting all providers:', error);
    return c.json({ error: 'Failed to disconnect providers' }, 500);
  }
});

// ===================================
// 교회 조회/등록 API
// ===================================

// GET /make-server-3ed9c009/churches?search=&city=
app.get("/make-server-3ed9c009/churches", verifyAuth, async (c) => {
  try {
    const search = (c.req.query('search') || '').trim();
    const city = (c.req.query('city') || '').trim();

    let query = supabase.from('churches')
      .select('id, church_code, name, address, city, district, phone, member_count, pastor, denomination')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (city && city !== '전체') {
      query = query.eq('city', city);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,address.ilike.%${search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    const churches = (data || []).map((church: any) => ({
      id: church.id,
      churchCode: church.church_code,
      name: church.name,
      address: church.address,
      city: church.city,
      district: church.district,
      phone: church.phone,
      memberCount: church.member_count || 0,
      pastor: church.pastor,
      denomination: church.denomination,
    }));

    return c.json({ churches });
  } catch (error) {
    console.error('Error fetching churches:', error);
    return c.json({ error: 'Failed to fetch churches' }, 500);
  }
});

// GET /make-server-3ed9c009/user/church-memberships
app.get("/make-server-3ed9c009/user/church-memberships", verifyAuth, async (c) => {
  try {
    const authUserId = c.get('userId');

    const { data: userRecord, error: userErr } = await supabase.from('users')
      .select('id')
      .eq('auth_user_id', authUserId)
      .single();

    if (userErr || !userRecord) {
      return c.json({ error: 'User not found' }, 404);
    }

    const { data, error } = await supabase.from('user_church_memberships')
      .select(`
        id,
        is_primary,
        status,
        joined_at,
        churches (
          id,
          church_code,
          name,
          address,
          city,
          district,
          phone,
          member_count,
          pastor,
          denomination
        )
      `)
      .eq('user_id', userRecord.id)
      .order('is_primary', { ascending: false })
      .order('joined_at', { ascending: true });

    if (error) throw error;

    const memberships = (data || []).map((row: any) => ({
      id: row.id,
      isPrimary: row.is_primary,
      status: row.status,
      joinedAt: row.joined_at,
      church: row.churches ? {
        id: row.churches.id,
        churchCode: row.churches.church_code,
        name: row.churches.name,
        address: row.churches.address,
        city: row.churches.city,
        district: row.churches.district,
        phone: row.churches.phone,
        memberCount: row.churches.member_count || 0,
        pastor: row.churches.pastor,
        denomination: row.churches.denomination,
      } : null,
    }));

    return c.json({ memberships });
  } catch (error) {
    console.error('Error fetching church memberships:', error);
    return c.json({ error: 'Failed to fetch church memberships' }, 500);
  }
});

// POST /make-server-3ed9c009/user/church-memberships
// body: { churchId?: string, churchCode?: string, manualChurch?: { name, address, city, district, phone, pastor, denomination } }
app.post("/make-server-3ed9c009/user/church-memberships", verifyAuth, async (c) => {
  try {
    const authUserId = c.get('userId');
    const body = await c.req.json();
    const { churchId, churchCode, manualChurch } = body;

    const { data: userRecord, error: userErr } = await supabase.from('users')
      .select('id')
      .eq('auth_user_id', authUserId)
      .single();

    if (userErr || !userRecord) {
      return c.json({ error: 'User not found' }, 404);
    }

    let targetChurch: any = null;
    let membershipStatus = 'approved';

    if (churchId) {
      const { data, error } = await supabase.from('churches')
        .select('*')
        .eq('id', churchId)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        return c.json({ error: 'Church not found' }, 404);
      }
      targetChurch = data;
    } else if (churchCode) {
      const normalized = String(churchCode).trim().toUpperCase();
      const { data, error } = await supabase.from('churches')
        .select('*')
        .eq('church_code', normalized)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        return c.json({ error: 'Invalid church code' }, 404);
      }
      targetChurch = data;
    } else if (manualChurch?.name && manualChurch?.address) {
      const { data, error } = await supabase.from('churches')
        .insert({
          name: manualChurch.name,
          address: manualChurch.address,
          city: manualChurch.city || '기타',
          district: manualChurch.district || null,
          phone: manualChurch.phone || null,
          member_count: 0,
          pastor: manualChurch.pastor || null,
          denomination: manualChurch.denomination || null,
          is_active: true,
        })
        .select('*')
        .single();

      if (error || !data) {
        console.error('Manual church insert error:', error);
        return c.json({ error: 'Failed to create church' }, 500);
      }

      targetChurch = data;
      membershipStatus = 'pending';
    } else {
      return c.json({ error: 'churchId, churchCode or manualChurch is required' }, 400);
    }

    const { data: existingMembership } = await supabase.from('user_church_memberships')
      .select('id')
      .eq('user_id', userRecord.id)
      .eq('church_id', targetChurch.id)
      .maybeSingle();

    if (existingMembership) {
      return c.json({ error: 'Already registered to this church' }, 409);
    }

    const { count } = await supabase.from('user_church_memberships')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userRecord.id)
      .in('status', ['approved', 'pending']);

    const isPrimary = (count || 0) === 0;

    const { data: inserted, error: insertErr } = await supabase.from('user_church_memberships')
      .insert({
        user_id: userRecord.id,
        church_id: targetChurch.id,
        is_primary: isPrimary,
        status: membershipStatus,
      })
      .select('id, is_primary, status, joined_at')
      .single();

    if (insertErr) {
      console.error('Insert church membership error:', insertErr);
      return c.json({ error: insertErr.message || 'Failed to register church membership' }, 500);
    }

    await supabase.from('users')
      .update({ church: targetChurch.name, updated_at: new Date().toISOString() })
      .eq('id', userRecord.id);

    return c.json({
      membership: {
        id: inserted.id,
        isPrimary: inserted.is_primary,
        status: inserted.status,
        joinedAt: inserted.joined_at,
        church: {
          id: targetChurch.id,
          churchCode: targetChurch.church_code,
          name: targetChurch.name,
          address: targetChurch.address,
          city: targetChurch.city,
          district: targetChurch.district,
          phone: targetChurch.phone,
          memberCount: targetChurch.member_count || 0,
          pastor: targetChurch.pastor,
          denomination: targetChurch.denomination,
        },
      },
    });
  } catch (error) {
    console.error('Error registering church membership:', error);
    return c.json({ error: 'Failed to register church membership' }, 500);
  }
});

// DELETE /make-server-3ed9c009/user/church-memberships/:membershipId
app.delete("/make-server-3ed9c009/user/church-memberships/:membershipId", verifyAuth, async (c) => {
  try {
    const authUserId = c.get('userId');
    const membershipId = c.req.param('membershipId');

    const { data: userRecord, error: userErr } = await supabase.from('users')
      .select('id')
      .eq('auth_user_id', authUserId)
      .single();

    if (userErr || !userRecord) {
      return c.json({ error: 'User not found' }, 404);
    }

    const { data: target, error: targetErr } = await supabase.from('user_church_memberships')
      .select('id, is_primary')
      .eq('id', membershipId)
      .eq('user_id', userRecord.id)
      .single();

    if (targetErr || !target) {
      return c.json({ error: 'Membership not found' }, 404);
    }

    const { error: delErr } = await supabase.from('user_church_memberships')
      .delete()
      .eq('id', membershipId)
      .eq('user_id', userRecord.id);

    if (delErr) {
      return c.json({ error: 'Failed to delete church membership' }, 500);
    }

    if (target.is_primary) {
      const { data: nextPrimary } = await supabase.from('user_church_memberships')
        .select('id')
        .eq('user_id', userRecord.id)
        .order('joined_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (nextPrimary?.id) {
        await supabase.from('user_church_memberships')
          .update({ is_primary: true })
          .eq('id', nextPrimary.id)
          .eq('user_id', userRecord.id);
      }
    }

    const { data: primaryMembership } = await supabase.from('user_church_memberships')
      .select('churches(name)')
      .eq('user_id', userRecord.id)
      .eq('is_primary', true)
      .maybeSingle();

    await supabase.from('users')
      .update({ church: primaryMembership?.churches?.name || null, updated_at: new Date().toISOString() })
      .eq('id', userRecord.id);

    return c.json({ status: 'deleted' });
  } catch (error) {
    console.error('Error deleting church membership:', error);
    return c.json({ error: 'Failed to delete church membership' }, 500);
  }
});

// POST /make-server-3ed9c009/user/providers/disconnect-all - 모든 소셜 계정 연동 해제 (계정 삭제 시)
app.post("/make-server-3ed9c009/user/providers/disconnect-all", verifyAuth, async (c) => {
  try {
    const userId = c.get('userId');

    const { error } = await supabase.from('user_providers')
      .delete()
      .eq('user_id', userId);

    if (error) throw error;

    return c.json({ status: 'all_disconnected' });
  } catch (error) {
    console.error('Error disconnecting all providers:', error);
    return c.json({ error: 'Failed to disconnect providers' }, 500);
  }
});

// --- Bible API (dummy data for now) ---
const DUMMY_BIBLE = {
  '창세기': {
    1: {
      1: '태초에 하나님이 천지를 창조하시니라',
      2: '땅이 혼돈하고 공허하며 흑암이 깊음 위에 있고 하나님의 영은 수면 위에 운행하시니라',
      3: '하나님이 이르시되 빛이 있으라 하시니 빛이 있었고',
    },
    2: {
      1: '천지와 만물이 다 이루어지니라',
    },
  },
};

// GET /make-server-3ed9c009/bible/book/:book/chapter/:chapter
app.get('/make-server-3ed9c009/bible/book/:book/chapter/:chapter', async (c) => {
  const { book, chapter } = c.req.param();
  const chapterNum = Number(chapter);
  const data = DUMMY_BIBLE[book]?.[chapterNum];
  if (!data) return c.json({ error: 'Not found' }, 404);
  return c.json({ book, chapter: chapterNum, verses: data });
});

// GET /make-server-3ed9c009/bible/book/:book/chapter/:chapter/verse/:verse
app.get('/make-server-3ed9c009/bible/book/:book/chapter/:chapter/verse/:verse', async (c) => {
  const { book, chapter, verse } = c.req.param();
  const chapterNum = Number(chapter);
  const verseNum = Number(verse);
  const text = DUMMY_BIBLE[book]?.[chapterNum]?.[verseNum];
  if (!text) return c.json({ error: 'Not found' }, 404);
  return c.json({ book, chapter: chapterNum, verse: verseNum, text });
});

// GET /make-server-3ed9c009/bible/search?q=...
app.get('/make-server-3ed9c009/bible/search', async (c) => {
  const q = (c.req.query('q') || '').trim();
  if (!q) return c.json({ results: [] });
  // Dummy search: scan all dummy verses
  const results = [];
  for (const [book, chapters] of Object.entries(DUMMY_BIBLE)) {
    for (const [chapter, verses] of Object.entries(chapters)) {
      for (const [verse, text] of Object.entries(verses)) {
        if (typeof text === 'string' && text.includes(q)) {
          results.push({ book, chapter: Number(chapter), verse: Number(verse), text });
        }
      }
    }
  }
  return c.json({ results });
});

Deno.serve(app.fetch);