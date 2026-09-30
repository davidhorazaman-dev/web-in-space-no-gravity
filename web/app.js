const $=id=>document.getElementById(id);
async function load(){
  const projects=await fetch("/api/projects").then(r=>r.json());
  $("projects").innerHTML=projects.length?projects.map(p=>`
    <article class="project">
      <div><strong>${escapeHtml(p.title)}</strong><small>${formatDuration(p.targetDurationSeconds)} · ${p.status}</small></div>
      <div class="bar"><span style="width:${p.progress||0}%"></span></div>
      <button onclick="generate('${p.id}')">Generate / Resume</button>
    </article>`).join(""):"No projects yet.";
}
async function create(){
  const body={title:$("title").value,prompt:$("prompt").value,targetDurationSeconds:Number($("duration").value)};
  const r=await fetch("/api/projects",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
  if(!r.ok){alert((await r.json()).error);return}
  await load();
}
async function generate(id){
  await fetch(`/api/projects/${id}/generate`,{method:"POST"});
  watch(id);
}
function watch(id){
  const es=new EventSource(`/api/projects/${id}/progress`);
  es.onmessage=e=>{load(); const d=JSON.parse(e.data); if(["completed","error","cancelled"].includes(d.status)) es.close();};
}
function formatDuration(s){s=Number(s); const h=Math.floor(s/3600),m=Math.floor((s%3600)/60),sec=s%60; return h?`${h}h ${m}m ${sec}s`:m?`${m}m ${sec}s`:`${sec}s`;}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));}
$("create").onclick=create; load();
