import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";

dotenv.config();

// Handle ESM vs CJS for path resolution
const getAppDirname = () => {
  try {
    // @ts-ignore
    return __dirname;
  } catch {
    return path.dirname(fileURLToPath(import.meta.url));
  }
};

const APP_DIRNAME = getAppDirname();

// Initialize Firebase Admin
const firebaseConfig = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'firebase-applet-config.json'), 'utf8'));
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: firebaseConfig.projectId,
  });
}
const db = getFirestore(admin.app(), firebaseConfig.firestoreDatabaseId);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());
  app.use(cookieParser());

  // Auth Middleware
  const authenticate = async (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const idToken = authHeader.split('Bearer ')[1];
    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      req.user = decodedToken;
      next();
    } catch (error) {
      console.error('Error verifying token:', error);
      res.status(401).json({ error: 'Unauthorized' });
    }
  };

  console.log("Environment Variables Debug:");
  Object.keys(process.env).forEach(key => {
    if (key.startsWith("GEMINI") || key.startsWith("VITE")) {
      const val = process.env[key];
      console.log(`${key}: ${val ? `Present (length: ${val.length}, starts with: ${val.substring(0, 4)})` : "Missing"}`);
    }
  });

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "YatraMitra API is healthy" });
  });

  // Connections API
  app.get("/api/users/:userId/connections/count", async (req, res) => {
    const { userId } = req.params;
    try {
      // Query for connections where user is sender and status is accepted
      const senderQuery = db.collection('connections')
        .where('sender_id', '==', userId)
        .where('status', '==', 'accepted');
      
      // Query for connections where user is receiver and status is accepted
      const receiverQuery = db.collection('connections')
        .where('receiver_id', '==', userId)
        .where('status', '==', 'accepted');

      const [senderSnap, receiverSnap] = await Promise.all([
        senderQuery.get(),
        receiverQuery.get()
      ]);

      const totalCount = senderSnap.size + receiverSnap.size;
      res.json({ count: totalCount });
    } catch (error: any) {
      console.error('Error fetching connection count:', error);
      res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  });

  app.get("/api/users/:userId/connections", async (req, res) => {
    const { userId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    try {
      // Fetch all accepted connections for the user
      const senderQuery = db.collection('connections')
        .where('sender_id', '==', userId)
        .where('status', '==', 'accepted');
      
      const receiverQuery = db.collection('connections')
        .where('receiver_id', '==', userId)
        .where('status', '==', 'accepted');

      const [senderSnap, receiverSnap] = await Promise.all([
        senderQuery.get(),
        receiverQuery.get()
      ]);

      const connectionUids = [
        ...senderSnap.docs.map(doc => doc.data().receiver_id),
        ...receiverSnap.docs.map(doc => doc.data().sender_id)
      ];

      if (connectionUids.length === 0) {
        return res.json({ connections: [], total: 0 });
      }

      // Paginate the UIDs
      const paginatedUids = connectionUids.slice(offset, offset + limit);

      // Fetch user profiles for these UIDs
      const userProfilesPromises = paginatedUids.map(async (uid) => {
        const userDoc = await db.collection('users').doc(uid).get();
        if (userDoc.exists) {
          const data = userDoc.data();
          return {
            uid: userDoc.id,
            name: data?.name,
            username: data?.username,
            photo_url: data?.photo_url,
            location_city: data?.location_city,
            location_country: data?.location_country
          };
        }
        return null;
      });

      const connections = (await Promise.all(userProfilesPromises)).filter(p => p !== null);

      res.json({
        connections,
        total: connectionUids.length,
        page,
        limit
      });
    } catch (error: any) {
      console.error('Error fetching connections:', error);
      res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  });

  // Auth & User API placeholders (to be expanded)
  app.post("/api/auth/register", (req, res) => {
    // Logic for registration
    res.status(201).json({ message: "User registered" });
  });

  app.post("/api/auth/login", (req, res) => {
    // Logic for login
    res.json({ token: "fake-jwt-token" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
