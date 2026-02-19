import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";
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
      .select('id, email, name, avatar_url, provider, created_at')
      .eq('auth_user_id', authUserId)
      .single();

    if (error || !userRecord) {
      console.error('User record not found:', error);
      return c.json({ error: 'User profile not found' }, 404);
    }

    // daily_credits에서 오늘 크레딧 조회
    const today = new Date().toISOString().split('T')[0];
    const { data: creditData } = await supabase.from('daily_credits')
      .select('credits_earned, credits_spent')
      .eq('user_id', userRecord.id)
      .eq('date', today)
      .single();

    const profile = {
      userId: userRecord.id,
      email: userRecord.email,
      name: userRecord.name || 'User',
      avatarUrl: userRecord.avatar_url,
      provider: userRecord.provider,
      creditsEarned: creditData?.credits_earned || 0,
      creditsSpent: creditData?.credits_spent || 0,
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
    const { name, avatarUrl } = body;

    // users 테이블 업데이트
    const { data: updated, error } = await supabase.from('users')
      .update({
        name: name || undefined,
        avatar_url: avatarUrl || undefined,
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
    const { mode, verse, credits, book, chapter, verseNum } = body;

    // 1. users 테이블에서 user_id 조회
    const { data: userRecord } = await supabase.from('users')
      .select('id')
      .eq('auth_user_id', authUserId)
      .single();

    if (!userRecord) {
      return c.json({ error: 'User not found' }, 404);
    }

    const userId = userRecord.id;
    const date = new Date().toISOString().split('T')[0];

    // 2. daily_credits에 크레딧 추가 (함수 호출)
    const { data: creditResult, error: creditError } = await supabase.rpc(
      'increase_credits_for_user',
      { p_user_id: userId, p_amount: credits }
    );

    if (creditError) {
      console.error('Error updating credits:', creditError);
      return c.json({ error: 'Failed to update credits' }, 500);
    }

    // 3. transcriptions_progress 업데이트 (마지막 필사 위치)
    const { error: progressError } = await supabase.from('transcriptions_progress')
      .upsert({
        user_id: userId,
        book,
        chapter,
        verse: verseNum,
        progress_json: { lastUpdated: new Date().toISOString(), mode },
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,book' });

    if (progressError) {
      console.error('Error updating progress:', progressError);
    }

    // 4. KV 스토어에도 저장 (호환성을 위해)
    const timestamp = Date.now();
    const transcriptionId = `${timestamp}-${Math.random().toString(36).substr(2, 9)}`;
    const transcriptionKey = `user:${authUserId}:transcription:${transcriptionId}`;
    await kv.set(transcriptionKey, {
      id: transcriptionId,
      userId: authUserId,
      mode,
      verse,
      credits,
      book,
      chapter,
      verseNum,
      date,
      timestamp: new Date().toISOString(),
    });

    return c.json({
      transcription: {
        id: transcriptionId,
        credits,
        book,
        chapter,
        verseNum,
        date,
      },
      dailyEarned: creditResult?.[0]?.credits_earned || credits,
    });
  } catch (error) {
    console.error('Error saving transcription:', error);
    return c.json({ error: 'Failed to save transcription' }, 500);
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
      const { data: monthStats, error } = await supabase.from('daily_credits')
        .select('*')
        .eq('user_id', userId)
        .gte('date', `${month}-01`)
        .lt('date', `${month}-32`);

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
    const prefix = `user:${authUserId}:transcription:`;

    const transcriptions = await kv.getByPrefix(prefix);

    // Create a map of completed verses: { "genesis-1-1": true, ... }
    const completedVerses: { [key: string]: boolean } = {};
    transcriptions.forEach((t: any) => {
      if (t.book && t.chapter && t.verseNum) {
        const key = `${t.book}-${t.chapter}-${t.verseNum}`;
        completedVerses[key] = true;
      }
    });

    return c.json({ completedVerses });
  } catch (error) {
    console.error('Error fetching completed verses:', error);
    return c.json({ error: 'Failed to fetch completed verses' }, 500);
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