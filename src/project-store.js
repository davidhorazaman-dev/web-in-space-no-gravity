import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export function createProjectStore(root) {
  fs.mkdirSync(root,{recursive:true});
  const file = path.join(root,"projects.json");
  if (!fs.existsSync(file)) fs.writeFileSync(file,"{}");
  const read = () => JSON.parse(fs.readFileSync(file,"utf8"));
  const write = data => fs.writeFileSync(file,JSON.stringify(data,null,2));

  return {
    list() { return Object.values(read()).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)); },
    get(id) { return read()[id] || null; },
    create(input) {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const project = {
        id,
        title: input.title,
        prompt: input.prompt,
        targetDurationSeconds: input.targetDurationSeconds,
        status:"draft",
        progress:0,
        createdAt:now,
        updatedAt:now,
        segments:[]
      };
      const all=read(); all[id]=project; write(all); return project;
    },
    update(id,patch) {
      const all=read();
      if (!all[id]) throw new Error("Project not found");
      all[id]={...all[id],...patch,updatedAt:new Date().toISOString()};
      write(all); return all[id];
    },
    remove(id) {
      const all=read(); delete all[id]; write(all);
    }
  };
}
