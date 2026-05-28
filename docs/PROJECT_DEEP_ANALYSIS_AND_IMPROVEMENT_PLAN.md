# StrangerConfide - Deep Analysis & Improvement Plan

> Muc tieu: luu lai cac phat hien ky thuat de xu ly sau release.
> Chien luoc hien tai: uu tien hoan thanh feature de release nhanh, sau do hardening theo backlog.

## 1) Tong quan nhanh

- Stack: NestJS + Next.js 15 + MongoDB + Redis + Socket.IO.
- Kien truc module ro rang, flow matchmaking/chat hoat dong tot cho MVP.
- Diem can uu tien sau release: security hardening, test coverage, va kha nang scale.

## 2) Diem manh hien tai (giu nguyen de release)

- Kien truc backend theo module (auth, profile, matchmaking, chat, moderation, blocklist).
- Matchmaking Redis co lock atomic (`tryAtomicMatch` + `claimPair`) giam race condition.
- REST API da co envelope response thong nhat + exception filter.
- Chat flow realtime + room lifecycle ro rang, co cleanup khi dong phong.
- Frontend tach hooks/use-case kha sach, co middleware route guard co ban.

## 3) Rui ro da phat hien (uu tien release-aware)

### 3.1 Critical / Cao (can xu ly som sau release)

1. **Secret trong env example**
   - `backend/.env.example` dang chua gia tri OAuth co ve la that.
   - Hanh dong: rotate secret, thay bang placeholder ngay sau release.

2. **OAuth callback tra token qua query string**
   - Token co the lo qua browser history, logs, referer.
   - Hanh dong: doi qua flow set cookie an toan (httpOnly) o phase hardening.

3. **OTP bypass co the bat trong production**
   - `ALLOW_OTP_BYPASS=true` trong env mau la nguy co cau hinh sai.
   - Hanh dong: dat default an toan va bo bypass o production.

4. **WebSocket CORS production dang mo rong**
   - Adapter socket de `origin: true` khi production.
   - Hanh dong: dung allowlist domain production ro rang.

### 3.2 Trung binh (nen dua vao sprint ngay sau release)

1. **Khong co test coverage**
   - Chua co unit/integration/e2e tests thuc te.
2. **Refresh token chua rotate/revoke**
   - Hien tai verify token thu dong, chua co token lifecycle manh.
3. **JWT sau khi ban user**
   - Chua thay check trang thai banned o layer strategy/guard.
4. **State in-memory cho websocket**
   - Presence/spam/timers in-memory, kho scale ngang.
5. **Matchmaking scan O(N)**
   - `zrange(0, -1)` de tim candidate, co the ton tai chi phi lon khi queue tang.

## 4) Ke hoach theo giai doan (uu tien release truoc)

## Giai doan A - Truoc release (chi giu cac thay doi it risk)

- [ ] Khoa env production:
  - [ ] `ALLOW_OTP_BYPASS=false`
  - [ ] thay tat ca secret that bang secret moi tren moi truong production
- [ ] Chot CORS domain cho frontend production (HTTP + WS)
- [ ] Smoke test:
  - [ ] auth local
  - [ ] matchmaking co room
  - [ ] chat text + upload image
- [ ] Tao checklist rollback/co so monitor toi thieu

> Muc tieu giai doan A: release an toan toi thieu, khong refactor lon.

## Giai doan B - Sau release (Hardening Sprint 1)

- [ ] Bo token query trong OAuth callback, chuyen sang cookie/session an toan.
- [ ] Doi OTP generator sang `crypto.randomInt`.
- [ ] Bo sung check user status (ban/locked) o JWT validation path.
- [ ] Thong nhat CORS policy cho HTTP va WS theo allowlist.
- [ ] Tach/clean dead code guard hoac dang ky dung guard tuy chinh.

## Giai doan C - Sau release (Quality Sprint 2)

- [ ] Bo sung test toi thieu:
  - [ ] unit: matchmaking compatibility + moderation
  - [ ] integration: auth refresh + OTP flow
  - [ ] e2e: register -> verify -> queue -> match -> chat -> close room
- [ ] Them health endpoint + readiness checks.
- [ ] Cai thien logging co cau truc + theo doi requestId xuyen suot.

## Giai doan D - Scale Sprint 3

- [ ] Socket.IO Redis adapter + sticky session.
- [ ] Dua spam/presence state khoi in-memory (Redis/shared state).
- [ ] Toi uu matchmaking query strategy (giam scan full queue).
- [ ] Danh gia tach service (chat/matchmaking) neu traffic tang.

## 5) De xuat quy chuan nen theo

- **Security baseline:** OWASP ASVS Level 2 cho auth/session/token.
- **API/Backend style:** NestJS best practices + typed error contract thong nhat.
- **Realtime scale:** Socket.IO multi-instance best practices (Redis adapter).
- **Testing strategy:** test pyramid practical cho backend va luong e2e quan trong.
- **Release discipline:** trunk-based + feature flags + post-release hardening sprint.

## 6) Backlog uu tien de copy vao issue tracker

### P0 (Ngay sau release)
- [ ] Rotate va scrub tat ca secrets bi lo trong repo/env example.
- [ ] Chuyen OAuth callback token flow sang cookie secure.
- [ ] Tat OTP bypass hoan toan tren production.
- [ ] Khoa CORS production theo domain allowlist.

### P1 (1-2 sprint)
- [ ] Them test cho auth + matchmaking + chat critical path.
- [ ] Them refresh token rotation/revoke.
- [ ] Kiem tra `isBanned` trong JWT validation path.
- [ ] Chuan hoa error payload cho websocket events.

### P2 (Scale)
- [ ] Socket.IO Redis adapter.
- [ ] Chuyen cac state in-memory quan trong sang Redis.
- [ ] Toi uu matchmaking scanning.

## 7) Nhan xet cuoi

Du an dang o trang thai **MVP kha tot de release feature**.  
Huong di hop ly: **release nho, nhanh**, sau do vao hardening theo danh sach tren de dat muc production readiness cao hon.

