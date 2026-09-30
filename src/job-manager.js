import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

export class JobManager {
  constructor({store,outputDir,ffmpegEnabled,ffmpegBin}) {
    this.store=store; this.outputDir=outputDir; this.ffmpegEnabled=ffmpegEnabled; this.ffmpegBin=ffmpegBin;
    this.jobs=new Map();
    fs.mkdirSync(outputDir,{recursive:true});
  }

  start(id) {
    if (this.jobs.has(id)) return;
    const state={status:"running",progress:0,message:"Planning segments",cancelled:false};
    this.jobs.set(id,state);
    this.store.update(id,{status:"running",progress:0});
    this.run(id).catch(error=>{
      this.jobs.set(id,{...state,status:"error",message:error.message});
      this.store.update(id,{status:"error",progress:state.progress,error:error.message});
    });
  }

  status(id) {
    return this.jobs.get(id) || {status:this.store.get(id)?.status || "unknown",progress:this.store.get(id)?.progress || 0};
  }

  cancel(id) {
    const state=this.jobs.get(id);
    if (state) state.cancelled=true;
  }

  async run(id) {
    const project=this.store.get(id);
    const segmentLength=300;
    const count=Math.ceil(project.targetDurationSeconds/segmentLength);
    const segments=Array.from({length:count},(_,i)=>({
      index:i+1,
      startSeconds:i*segmentLength,
      durationSeconds:Math.min(segmentLength,project.targetDurationSeconds-i*segmentLength),
      status:"pending"
    }));
    this.store.update(id,{segments});

    for (let i=0;i<segments.length;i++) {
      const state=this.jobs.get(id);
      if (!state || state.cancelled) {
        this.store.update(id,{status:"cancelled"});
        return;
      }
      segments[i].status="generated";
      state.progress=Math.round(((i+1)/segments.length)*100);
      state.message=`Generated segment ${i+1} of ${segments.length}`;
      this.store.update(id,{segments,progress:state.progress});
      await new Promise(r=>setTimeout(r,50));
    }

    if (this.ffmpegEnabled) await this.renderPlaceholder(id,project);
    const state=this.jobs.get(id);
    state.status="completed"; state.progress=100; state.message="Generation completed";
    this.store.update(id,{status:"completed",progress:100});
  }

  renderPlaceholder(id,project) {
    return new Promise((resolve,reject)=>{
      const out=path.join(this.outputDir,`${id}.mp4`);
      const duration=Math.max(1,project.targetDurationSeconds);
      const child=spawn(this.ffmpegBin,["-y","-f","lavfi","-i","color=c=black:s=1280x720:r=30","-t",String(duration),"-c:v","libx264","-pix_fmt","yuv420p",out]);
      let error="";
      child.stderr.on("data",d=>{error+=d.toString();});
      child.on("error",reject);
      child.on("close",code=>code===0?resolve():reject(new Error(error.slice(-1000)||"FFmpeg failed")));
    });
  }
}
