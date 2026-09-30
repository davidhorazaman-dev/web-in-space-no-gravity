import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { JobManager } from "./job-manager.js";
import { createProjectStore } from "./project-store.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = Number(process.env.PORT || 3000);
const store = createProjectStore(process.env.DATA_DIR || "./data");
const jobs = new JobManager({
  store,
  outputDir: process.env.OUTPUT_DIR || "./output",
  ffmpegEnabled: process.env.ENABLE_FFMPEG === "true",
  ffmpegBin: process.env.FFMPEG_BIN || "ffmpeg"
});

app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "..", "web")));

app.get("/api/health", (_req,res)=>res.json({ok:true,service:"unlimited-ai-explainer"}));

app.post("/api/projects", (req,res)=>{
  try {
    const project = store.create({
      title: String(req.body.title || "Untitled Explainer"),
      prompt: String(req.body.prompt || ""),
      targetDurationSeconds: normalizeDuration(req.body.targetDurationSeconds)
    });
    res.status(201).json(project);
  } catch (error) {
    res.status(400).json({error:error.message});
  }
});

app.get("/api/projects", (_req,res)=>res.json(store.list()));

app.get("/api/projects/:id", (req,res)=>{
  const project = store.get(req.params.id);
  if (!project) return res.status(404).json({error:"Project not found"});
  res.json(project);
});

app.post("/api/projects/:id/generate", async (req,res)=>{
  const project = store.get(req.params.id);
  if (!project) return res.status(404).json({error:"Project not found"});
  jobs.start(project.id);
  res.status(202).json({id:project.id,status:"queued"});
});

app.get("/api/projects/:id/progress",(req,res)=>{
  const project = store.get(req.params.id);
  if (!project) return res.status(404).json({error:"Project not found"});
  res.setHeader("Content-Type","text/event-stream");
  res.setHeader("Cache-Control","no-cache");
  res.setHeader("Connection","keep-alive");
  const send = data => res.write(`data: ${JSON.stringify(data)}\\n\\n`);
  send(jobs.status(project.id));
  const timer = setInterval(()=>send(jobs.status(project.id)),1000);
  req.on("close",()=>clearInterval(timer));
});

app.delete("/api/projects/:id",(req,res)=>{
  if (!store.get(req.params.id)) return res.status(404).json({error:"Project not found"});
  jobs.cancel(req.params.id);
  store.remove(req.params.id);
  res.status(204).end();
});

app.use((req,res,next)=>{\n  if (req.path.startsWith("/api/")) return next();\n  res.sendFile(path.join(__dirname,"..","web","index.html"));\n});

function normalizeDuration(value) {
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds <= 0) throw new Error("targetDurationSeconds must be a positive number");
  return Math.floor(seconds);
}

app.listen(port,()=>console.log(`Unlimited AI Explainer running at http://localhost:${port}`));
