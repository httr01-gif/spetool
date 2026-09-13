# 특수교육 AI 도구함

경산자인학교에서 개발한 특수교육대상학생용 웹 수업자료를 모아 공개하는 정적 사이트입니다.
자료를 바로 실행하고, 파일로 내려받고, 제작 프롬프트를 복사할 수 있습니다.

## 폴더 구조

| 경로 | 역할 |
|---|---|
| `index.html` | 도구함 메인 화면. 검색, 필터, 상세 보기, 프롬프트 복사, QR 생성 |
| `tools.json` | 자료 목록과 설명, 프롬프트. **자료를 추가하거나 고칠 때 이 파일만 수정** |
| `apps/` | 자료 원본 HTML 파일 8건 |
| `api/track.js` | 실행, 내려받기, 프롬프트 복사 이벤트 기록. 화면에는 표시하지 않음 |
| `api/stats.js` | 관리자 전용 집계 조회 |
| `vercel.json` | 캐시 및 보안 헤더 설정 |

---

## 1단계. 깃허브에 올리기

1. github.com 로그인 후 오른쪽 위 `+` 버튼에서 `New repository` 선택
2. Repository name에 `sped-ai-toolbox` 입력, `Public` 선택, `Create repository` 클릭
3. 다음 화면에서 `uploading an existing file` 링크 클릭
4. 이 폴더 안의 **내용물 전체**를 끌어다 놓기(폴더 자체가 아니라 안의 파일과 폴더를 선택)
5. 아래 `Commit changes` 클릭

## 2단계. Vercel에 연결하기

1. vercel.com에 깃허브 계정으로 로그인
2. `Add New` → `Project` → 방금 만든 저장소 `Import`
3. Framework Preset은 `Other`로 두고 나머지는 기본값 유지
4. `Deploy` 클릭. 1분 이내에 `https://sped-ai-toolbox.vercel.app` 형태의 주소 생성
5. 이후 깃허브에 파일을 수정해 올리면 자동으로 다시 배포됨

## 3단계. 다운로드 집계 켜기

집계 저장소를 연결하기 전까지는 이벤트가 Vercel 로그에만 남고 누적되지 않습니다.

1. Vercel 프로젝트 화면에서 `Storage` 탭 선택
2. `Upstash for Redis` 선택 후 무료 플랜으로 생성하고 프로젝트에 연결
   - 연결하면 `KV_REST_API_URL`, `KV_REST_API_TOKEN` 환경변수가 자동 등록됨
3. `Settings` → `Environment Variables`에서 아래 항목을 직접 추가
   - 이름 `STATS_KEY`, 값은 본인만 아는 임의의 문자열(예: `jain2026stat`)
4. `Deployments` 탭에서 최신 배포를 `Redeploy`

### 집계 확인 방법

| 목적 | 주소 |
|---|---|
| 표로 보기 | `https://주소/api/stats?key=STATS_KEY값&format=html` |
| 전체 누적(JSON) | `https://주소/api/stats?key=STATS_KEY값` |
| 특정 날짜 | `https://주소/api/stats?key=STATS_KEY값&day=2026-09-13` |

기록 항목은 `open`(바로 실행), `download`(내려받기), `prompt`(프롬프트 복사) 세 가지입니다.
날짜별 기록은 400일간 보관됩니다.

## 4단계. 학교 홈페이지에 붙이기

권장 방식은 **링크 연결**입니다. 학교 홈페이지 메뉴에 바로가기를 만들고 새 창으로 열도록 설정합니다.

홈페이지 안에 끼워 넣어야 한다면 게시글 HTML 편집 화면에서 아래 코드를 사용합니다.

```html
<iframe src="https://sped-ai-toolbox.vercel.app/"
        style="width:100%;height:900px;border:0"
        title="특수교육 AI 도구함"
        allow="camera; microphone"></iframe>
```

`allow` 속성이 없으면 카메라와 마이크를 쓰는 자료가 동작하지 않습니다.

---

## 자료 추가하고 고치기

1. 새 HTML 파일을 `apps/` 폴더에 넣기(파일명은 영문 소문자와 하이픈 사용)
2. `tools.json`의 `items` 배열에 항목을 하나 추가
3. 깃허브에 올리면 자동 반영

### tools.json 항목 형식

| 항목 | 설명 |
|---|---|
| `id` | 영문 고유 이름. 집계 기준이 되므로 한 번 정하면 바꾸지 않음 |
| `name` | 화면에 보이는 자료명 |
| `file` | `apps/파일명.html`. 파일을 제공하지 않으면 `null` |
| `downloadable` | 실행과 내려받기 버튼 표시 여부 |
| `subject` `grade` `form` | 필터 기준. 교과, 학년, 형태 |
| `device` | 필요 환경 배열. 예 `["터치","마이크","소리"]` |
| `players` `minutes` | 인원과 소요 시간 |
| `summary` | 카드에 보이는 한 문장 설명 |
| `howto` | 수업 활용 방법 배열. 3줄 권장 |
| `support` | 참여와 지원 방법 설명 |
| `prompt` | 제작 프롬프트 전문 |
| `notice` | 주의 문구. 있을 때만 표시 |
| `updated` | 갱신일. 최근 30일 이내면 NEW 배지 표시 |

---

## 공개 전 확인 사항

| 점검 항목 | 내용 |
|---|---|
| 개인정보 | 학생 얼굴, 이름, 목소리가 담긴 자료는 올리지 않음 |
| 실명 | 제작 교사 실명 표기는 본인 동의를 받은 경우에만 유지 |
| 외부 링크 | 외부 서버의 이미지나 스크립트를 쓰는 자료는 배포 후 실제로 보이는지 확인 |
| 저작권 | 상용 글꼴, 캐릭터, 사진을 쓴 자료는 사용 범위 확인 |
