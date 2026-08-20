(function(){
  const s=document.createElement('script');
  s.src='https://raw.githubusercontent.com/gustavohcorrea1995/PDFTOOLS1/main/PUBLIC/app.js';
  s.onload=function(){
    document.addEventListener('click', function(ev){
      const el=ev.target.closest('[data-id="annotate"]');
      if(!el) return;
      ev.preventDefault();
      ev.stopImmediatePropagation();
      openVisualEditor();
    }, true);
  };
  document.head.appendChild(s);

  async function openVisualEditor(){
    const hero=document.getElementById('hero');
    const workspace=document.getElementById('workspace');
    const title=document.getElementById('toolTitle');
    const body=document.getElementById('toolBody');
    if(!hero||!workspace||!title||!body) return;
    hero.classList.add('hidden'); workspace.classList.remove('hidden'); title.textContent='Adicionar texto/imagem'; body.innerHTML='';
    const dz=document.createElement('div'); dz.className='dropzone'; dz.innerHTML='<div class="dz-title">Arraste um PDF para editar</div><p>Selecione um PDF para abrir o editor visual.</p>';
    const input=document.createElement('input'); input.type='file'; input.accept='.pdf'; input.hidden=true; dz.appendChild(input); body.appendChild(dz);
    const info=document.createElement('p'); info.className='hint'; body.appendChild(info);
    const editor=document.createElement('div'); editor.style.cssText='position:relative;max-width:100%;overflow:auto;background:#777;border:1px solid #3a4552;padding:12px;display:none'; body.appendChild(editor);
    const canvas=document.createElement('div'); canvas.style.cssText='position:relative;width:max-content;max-width:100%;margin:auto;line-height:0'; editor.appendChild(canvas);
    const img=document.createElement('img'); img.style.cssText='display:block;max-width:100%;height:auto'; canvas.appendChild(img);
    const layer=document.createElement('div'); layer.style.cssText='position:absolute;inset:0;pointer-events:none'; canvas.appendChild(layer);
    const nav=document.createElement('div'); nav.style.cssText='display:none;gap:8px;align-items:center;margin:10px 0;flex-wrap:wrap'; body.appendChild(nav);
    const prev=document.createElement('button'); prev.className='btn-ghost'; prev.textContent='← Página anterior'; const ind=document.createElement('span'); const next=document.createElement('button'); next.className='btn-ghost'; next.textContent='Próxima página →'; nav.append(prev,ind,next);
    const save=document.createElement('button'); save.className='btn'; save.textContent='Salvar PDF editado'; save.style.display='none'; body.appendChild(save);
    let fileId=null,page=1,count=0,thumbs=[],boxes=[],edits=[];
    const choose=()=>input.click(); dz.onclick=choose;
    input.onchange=()=>load(input.files[0]);
    dz.addEventListener('dragover',e=>{e.preventDefault();dz.classList.add('drag')}); dz.addEventListener('dragleave',()=>dz.classList.remove('drag')); dz.addEventListener('drop',e=>{e.preventDefault();dz.classList.remove('drag');load(e.dataTransfer.files[0])});
    async function load(file){ if(!file) return; info.textContent='Carregando PDF…'; const fd=new FormData(); fd.append('file',file); try{const r=await fetch('/api/inspect',{method:'POST',body:fd}); if(!r.ok) throw new Error(await r.text()); const d=await r.json(); fileId=d.fileId; count=d.pageCount; thumbs=d.thumbnails||[]; boxes=d.textBoxes||[]; edits=[]; page=1; editor.style.display='block'; nav.style.display=count>1?'flex':'none'; save.style.display='inline-block'; render(); info.textContent=`PDF carregado (${count} página(s)). Clique em um texto para editar.`;}catch(e){info.textContent='Erro ao carregar o PDF: '+e.message;}}
    function render(){ img.src=thumbs[page-1]||''; ind.textContent=`Página ${page} de ${count}`; img.onload=()=>{layer.innerHTML='';const scale=img.clientWidth/img.naturalWidth;boxes.filter(x=>x.page===page).forEach(t=>{const ch=edits.find(e=>e.id===t.id);if(ch&&ch.deleted)return;const b=document.createElement('div');b.textContent=ch?ch.text:t.text;b.style.cssText=`position:absolute;left:${t.x*scale}px;top:${t.y*scale}px;width:${Math.max(t.width*scale,3)}px;height:${Math.max(t.height*scale,6)}px;font: ${Math.max(t.height*.82*scale,8)}px Arial;color:transparent;background:rgba(255,235,59,.1);border:1px solid rgba(193,68,45,.28);pointer-events:auto;cursor:text;overflow:hidden;box-sizing:border-box`;b.onclick=e=>{e.stopPropagation();edit(t,ch?ch.text:t.text)};layer.appendChild(b)})}}
    function edit(t,value){const old=canvas.querySelector('.v-edit');if(old)old.remove();const p=document.createElement('div');p.className='v-edit';p.style.cssText='position:absolute;z-index:1000;background:#fff;color:#111;border:2px solid #c1442d;padding:10px;width:280px;box-shadow:0 8px 25px #0005;line-height:normal';p.style.left='10px';p.style.top='10px';const ta=document.createElement('textarea');ta.value=value;ta.style.cssText='width:100%;min-height:70px;box-sizing:border-box';const row=document.createElement('div');row.style.cssText='display:flex;gap:6px;margin-top:8px';const ok=document.createElement('button');ok.textContent='Salvar';const del=document.createElement('button');del.textContent='Excluir';const cancel=document.createElement('button');cancel.textContent='Cancelar';row.append(ok,del,cancel);p.append('Editar texto',ta,row);canvas.appendChild(p);ta.focus();ok.onclick=()=>{setEdit(t,ta.value,false);p.remove();render()};del.onclick=()=>{setEdit(t,'',true);p.remove();render()};cancel.onclick=()=>p.remove()}
    function setEdit(t,text,deleted){const e=edits.find(x=>x.id===t.id);if(e){e.text=text;e.deleted=deleted}else edits.push({id:t.id,page:t.page,x:t.pdfX??t.x,y:t.pdfY??t.y,width:t.pdfWidth??t.width,height:t.pdfHeight??t.height,fontSize:t.fontSize||Math.max(t.height,7),text,deleted})}
    prev.onclick=()=>{if(page>1){page--;render()}};next.onclick=()=>{if(page<count){page++;render()}};
    save.onclick=async()=>{if(!fileId)return;const fd=new FormData();fd.append('fileId',fileId);fd.append('annotations',JSON.stringify(edits));save.disabled=true;save.textContent='Salvando…';try{const r=await fetch('/api/edit/annotate',{method:'POST',body:fd});if(!r.ok)throw new Error(await r.text());const blob=await r.blob();const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='editado.pdf';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}catch(e){alert(e.message)}finally{save.disabled=false;save.textContent='Salvar PDF editado'}};
  }
})();
