
  # Gleam

  This is a code bundle for Gleam. The original project is available at https://www.figma.com/design/8WIf8DYMAe2mw3xn5oB9z4/Credit-Check-Dashboard.

  ## Running the code

  Run `npm i` to install the dependencies.

  ### Environment separation (dev / prod)

  1. Copy environment template:

  - Development: `cp .env.development.example .env.development`
  - Production: `cp .env.production.example .env.production`

  2. Fill real Supabase values:

  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - (optional) `VITE_API_BASE_URL` for local Edge Function

  3. Run by mode:

  - Dev server: `npm run dev -- --mode development`
  - Production build: `npm run build -- --mode production`

    ### Branch strategy (main / dev)

    - `main`: 배포 기준 브랜치
    - `dev`: 개발/버그수정/통합 테스트 브랜치

    기본 흐름:

    1. 최초 1회 dev 브랜치 생성
      - `git switch main`
      - `git pull origin main`
      - `git switch -c dev`
      - `git push -u origin dev`
    2. 일상 개발 시작
      - `git switch dev`
      - `git pull origin dev`
    3. 작업 단위 커밋 후 dev로 푸시
      - `git add .`
      - `git commit -m "feat: ..."`
      - `git push origin dev`
    4. 배포 시점에 `dev -> main` PR 머지

  Run `npm run dev` to start the development server.
  