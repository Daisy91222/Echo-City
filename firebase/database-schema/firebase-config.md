# Firebase 项目连接配置

*来源：Diasy 于 2026-09-21 在 Firebase 控制台 → 项目设置 → 你的应用 里提供。Client-side Firebase API key 不是敏感凭证（受 Security Rules 保护，不是访问密钥），可以安全地提交到公开仓库——真正的访问控制在 `database.rules.json`，不在这个 key 本身。*

```js
const firebaseConfig = {
  apiKey: "AIzaSyDF9QudEcceC9PJLgqPjpeePi303fbHqE4",
  authDomain: "echocity-9db43.firebaseapp.com",
  databaseURL: "https://echocity-9db43-default-rtdb.firebaseio.com",
  projectId: "echocity-9db43",
  storageBucket: "echocity-9db43.firebasestorage.app",
  messagingSenderId: "281769838117",
  appId: "1:281769838117:web:29e8934981417d274da1cc"
};
```

用途：W2 步进骨架（阶段 1）搭建 `apps/web` 时，`initializeApp(firebaseConfig)` 直接引用这份配置。
