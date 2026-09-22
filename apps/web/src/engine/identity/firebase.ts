import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { firebaseConfig } from "./firebaseConfig";

// 阶段 0 挪后到阶段 1 的验收动作在这里发生：initializeApp 接入真实 Firebase 项目，
// 在浏览器环境里（不受我这边沙盒的出网限制）真正读写测试数据。
export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const db = getDatabase(firebaseApp);
