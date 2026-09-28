export function qs(sel, el=document){ return el.querySelector(sel); }
export function qsa(sel, el=document){ return [...el.querySelectorAll(sel)]; }

export function toast(msg, kind="info"){
  let host = document.getElementById("toastHost");
  if(!host){
    host = document.createElement("div");
    host.id = "toastHost";
    host.style.position = "fixed";
    host.style.left = "14px";
    host.style.bottom = "14px";
    host.style.zIndex = "9999";
    host.style.display = "flex";
    host.style.flexDirection = "column";
    host.style.gap = "10px";
    document.body.appendChild(host);
  }
  const t = document.createElement("div");
  t.className = "card";
  t.style.padding = "10px 12px";
  t.style.borderRadius = "14px";
  t.style.maxWidth = "420px";
  t.style.background = "rgba(16,24,37,.75)";
  t.style.backdropFilter = "blur(10px)";
  t.style.border = "1px solid rgba(231,238,247,.10)";
  t.style.boxShadow = "0 18px 60px rgba(0,0,0,.35)";
  t.innerHTML = `<div style="display:flex;gap:10px;align-items:flex-start">
    <div style="width:10px;height:10px;border-radius:999px;margin-top:4px;background:${kind==="ok"?"var(--ok)":kind==="warn"?"var(--copper)":kind==="danger"?"var(--danger)":"var(--accent)"}"></div>
    <div style="color:var(--fg1);font-size:.92rem;line-height:1.25">${escapeHtml(msg)}</div>
  </div>`;
  host.appendChild(t);
  setTimeout(()=>{ t.style.opacity="0"; t.style.transform="translateY(6px)"; t.style.transition="all .25s ease"; }, 2400);
  setTimeout(()=>{ t.remove(); }, 2800);
}

function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, (m)=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" }[m]));
}