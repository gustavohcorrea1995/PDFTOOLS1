const toolGrid = document.getElementById('toolGrid');
const hero = document.getElementById('hero');
const workspace = document.getElementById('workspace');
const toolTitle = document.getElementById('toolTitle');
const toolBody = document.getElementById('toolBody');
const backBtn = document.getElementById('backBtn');
const toastEl = document.getElementById('toast');

function toast(msg, isError=false){
  toastEl.textContent = msg;
  toastEl.className = 'show' + (isError ? ' error' : '');
  clearTimeout(toast._t);
  toast._t = setTimeout(()=> toastEl.className='', 3200);
}

const TOOLS = [
  { id:'merge', icon:'🧷', title:'Juntar PDFs', desc:'Combine vários arquivos PDF em um só, na ordem que quiser.', tag:'Organizar' },
  { id:'split', icon:'✂️', title:'Dividir PDF', desc:'Separe páginas em arquivos independentes ou extraia intervalos.', tag:'Organizar' },
  { id:'edit', icon:'🗂️', title:'Organizar páginas', desc:'Exclua, gire e reordene páginas de um PDF.', tag:'Editar' },
  { id:'annotate', icon:'✍️', title:'Adicionar texto/imagem', desc:'Insira texto ou carimbe uma imagem em qualquer página.', tag:'Editar' },
  { id:'ocr', icon:'🔎', title:'OCR — Tornar PDF pesquisável', desc:'Reconheça textos de fotos e PDFs escaneados para pesquisar e editar.', tag:'Converter' },
  { id:'compress', icon:'🗜️', title:'Comprimir PDF', desc:'Reduza o tamanho do arquivo mantendo a qualidade legível.', tag:'Otimizar' },
  { id:'images-to-pdf', icon:'🖼️', title:'Imagens → PDF', desc:'Transforme fotos e imagens em um único PDF.', tag:'Converter' },
  { id:'pdf-to-images', icon:'📷', title:'PDF → Imagens', desc:'Exporte cada página como PNG ou JPG.', tag:'Converter' },
  { id:'office-to-pdf', icon:'📝', title:'Word/Excel/PPT → PDF', desc:'Converta documentos do Office para PDF.', tag:'Converter' },
  { id:'pdf-to-office', icon:'📄', title:'PDF → Word', desc:'Converta um PDF de volta para um documento editável.', tag:'Converter' },
];

function renderGrid(){
  toolGrid.innerHTML = '';
  TOOLS.forEach(t=>{
    const card = document.createElement('div');
    card.className = 'tool-card';
    card.innerHTML = `<span class="stamp-mark">${t.tag}</span>
      <div class="icon">${t.icon}</div>
      <h3>${t.title}</h3><p>${t.desc}</p>`;
    card.onclick = () => openTool(t.id);
    toolGrid.appendChild(card);
  });
}
renderGrid();

backBtn.onclick = () => {
  workspace.classList.add('hidden');
  hero.classList.remove('hidden');
  toolBody.innerHTML = '';
};

function openTool(id){
  const tool = TOOLS.find(t=>t.id===id);
  hero.classList.add('hidden');
  workspace.classList.remove('hidden');
  toolTitle.textContent = tool.title;
  toolBody.innerHTML = '';
  RENDERERS[id](toolBody);
}

function makeDropzone(container, { accept='*', multiple=true, label='Arraste arquivos aqui ou clique para escolher' }){
  const dz = document.createElement('div');
  dz.className = 'dropzone';
  dz.innerHTML = `<div class="dz-title">${label}</div><p>Seus arquivos ficam só no seu servidor local</p>`;
  const input = document.createElement('input');
  input.type = 'file'; input.accept = accept; input.multiple = multiple; input.style.display='none';
  dz.appendChild(input);
  container.appendChild(dz);
  const list = document.createElement('div'); list.className = 'file-list'; container.appendChild(list);
  let files = [];
  function renderList(){list.innerHTML='';files.forEach((f,i)=>{const row=document.createElement('div');row.className='file-row';row.innerHTML=`<span class="name">${f.name}</span>`;const rm=document.createElement('button');rm.textContent='✕';rm.onclick=e=>{e.stopPropagation();files.splice(i,1);renderList();dz.onchange&&dz.onchange(files)};row.appendChild(rm);list.appendChild(row)})}
  dz.onclick=()=>input.click(); input.onchange=()=>{files=multiple?files.concat(Array.from(input.files)):Array.from(input.files);renderList();dz.onchange&&dz.onchange(files);input.value=''};
  ['dragover','dragenter'].forEach(ev=>dz.addEventListener(ev,e=>{e.preventDefault();dz.classList.add('drag')}));
  ['dragleave','drop'].forEach(ev=>dz.addEventListener(ev,e=>{e.preventDefault();dz.classList.remove('drag')}));
  dz.addEventListener('drop',e=>{files=multiple?files.concat(Array.from(e.dataTransfer.files)):Array.from(e.dataTransfer.files);renderList();dz.onchange&&dz.onchange(files)});
  return {getFiles:()=>files,el:dz};
}
function makeButton(container,text){const btn=document.createElement('button');btn.className='btn';btn.textContent=text;container.appendChild(btn);return btn;}
function setLoading(btn,loading,text){btn.disabled=loading;btn.innerHTML=loading?`<span class="spinner"></span>${text||'Processando…'}`:btn.dataset.label;}
async function postForm(url,formData){const res=await fetch(url,{method:'POST',body:formData});if(!res.ok){let msg='Falha ao processar o arquivo.';try{const type=res.headers.get('content-type')||'';if(type.includes('application/json')){const data=await res.json();msg=data.error||msg}else{const text=await res.text();if(text)msg=text.slice(0,500)}}catch(_){}throw new Error(msg)}return res;}
function downloadBlob(blob,filename){if(!blob||blob.size===0)throw new Error('O servidor não retornou um arquivo válido.');const dot=filename.lastIndexOf('.'),defaultName=dot>0?filename.slice(0,dot):filename,extension=dot>0?filename.slice(dot):'';let chosen=window.prompt('Digite o nome do arquivo antes de baixar:',defaultName);if(chosen===null)return false;chosen=chosen.trim()||defaultName;chosen=chosen.replace(/[\\/:*?"<>|]/g,'_');if(extension&&!chosen.toLowerCase().endsWith(extension.toLowerCase()))chosen+=extension;const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=chosen;a.style.display='none';document.body.appendChild(a);a.click();setTimeout(()=>{a.remove();URL.revokeObjectURL(url)},1000);return true;}
const RENDERERS={};
RENDERERS.merge=root=>{const dz=makeDropzone(root,{accept:'.pdf',label:'Arraste 2 ou mais PDFs'}),btn=makeButton(root,'Juntar PDFs');btn.dataset.label=btn.textContent;btn.onclick=async()=>{const files=dz.getFiles();if(files.length<2)return toast('Selecione pelo menos 2 arquivos PDF.',true);const fd=new FormData();files.forEach(f=>fd.append('files',f));setLoading(btn,true,'Juntando…');try{const res=await postForm('/api/merge',fd);downloadBlob(await res.blob(),'unido.pdf');toast('PDFs unidos com sucesso!')}catch(e){toast(e.message,true)}setLoading(btn,false)}};
RENDERERS.split=root=>{const dz=makeDropzone(root,{accept:'.pdf',multiple:false,label:'Arraste um PDF'}),btn=makeButton(root,'Dividir PDF');btn.dataset.label=btn.textContent;btn.onclick=async()=>{const files=dz.getFiles();if(files.length!==1)return toast('Selecione um arquivo PDF.',true);const fd=new FormData();fd.append('file',files[0]);setLoading(btn,true,'Dividindo…');try{const res=await postForm('/api/split',fd);downloadBlob(await res.blob(),'partes.zip');toast('PDF dividido com sucesso!')}catch(e){toast(e.message,true)}setLoading(btn,false)}};
RENDERERS.compress=root=>{const dz=makeDropzone(root,{accept:'.pdf',multiple:false,label:'Arraste um PDF'}),btn=makeButton(root,'Comprimir PDF');btn.dataset.label=btn.textContent;btn.onclick=async()=>{const files=dz.getFiles();if(files.length!==1)return toast('Selecione um arquivo PDF.',true);const fd=new FormData();fd.append('file',files[0]);setLoading(btn,true,'Comprimindo…');try{const res=await postForm('/api/compress',fd);downloadBlob(await res.blob(),'comprimido.pdf');toast('PDF comprimido com sucesso!')}catch(e){toast(e.message,true)}setLoading(btn,false)}};
RENDERERS['images-to-pdf']=root=>{const dz=makeDropzone(root,{accept:'image/*',label:'Arraste imagens (JPG, PNG…)'}),btn=makeButton(root,'Converter para PDF');btn.dataset.label=btn.textContent;btn.onclick=async()=>{const files=dz.getFiles();if(files.length<1)return toast('Selecione pelo menos uma imagem.',true);const fd=new FormData();files.forEach(f=>fd.append('files',f));setLoading(btn,true,'Convertendo…');try{const res=await postForm('/api/convert/images-to-pdf',fd);downloadBlob(await res.blob(),'imagens.pdf');toast('PDF gerado com sucesso!')}catch(e){toast(e.message,true)}setLoading(btn,false)}};
RENDERERS['pdf-to-images']=root=>{const dz=makeDropzone(root,{accept:'.pdf',multiple:false,label:'Arraste um PDF'}),btn=makeButton(root,'Exportar páginas');btn.dataset.label=btn.textContent;btn.onclick=async()=>{const files=dz.getFiles();if(files.length!==1)return toast('Selecione um arquivo PDF.',true);const fd=new FormData();fd.append('file',files[0]);setLoading(btn,true,'Exportando…');try{const res=await postForm('/api/convert/pdf-to-images',fd);downloadBlob(await res.blob(),'paginas.zip');toast('Imagens exportadas com sucesso!')}catch(e){toast(e.message,true)}setLoading(btn,false)}};
RENDERERS['office-to-pdf']=root=>{const dz=makeDropzone(root,{accept:'.doc,.docx,.xls,.xlsx,.ppt,.pptx,.odt',multiple:false,label:'Arraste um Word, Excel ou PowerPoint'}),btn=makeButton(root,'Converter para PDF');btn.dataset.label=btn.textContent;btn.onclick=async()=>{const files=dz.getFiles();if(files.length!==1)return toast('Selecione um arquivo.',true);const fd=new FormData();fd.append('file',files[0]);fd.append('target','pdf');setLoading(btn,true,'Convertendo…');try{const res=await postForm('/api/convert/office',fd);downloadBlob(await res.blob(),'convertido.pdf');toast('Arquivo convertido com sucesso!')}catch(e){toast(e.message,true)}setLoading(btn,false)}};
RENDERERS['pdf-to-office']=root=>{const dz=makeDropzone(root,{accept:'.pdf',multiple:false,label:'Arraste um PDF'}),btn=makeButton(root,'Converter');btn.dataset.label=btn.textContent;btn.onclick=async()=>{const files=dz.getFiles();if(files.length!==1)return toast('Selecione um arquivo PDF.',true);const fd=new FormData();fd.append('file',files[0]);fd.append('target','docx');setLoading(btn,true,'Convertendo…');try{const res=await postForm('/api/convert/office',fd);downloadBlob(await res.blob(),'convertido.docx');toast('Arquivo convertido com sucesso!')}catch(e){toast(e.message,true)}setLoading(btn,false)}};
RENDERERS.ocr=root=>{const dz=makeDropzone(root,{accept:'.pdf,image/*',multiple:false,label:'Arraste um PDF escaneado ou imagem'}),btn=makeButton(root,'Tornar PDF pesquisável');btn.dataset.label=btn.textContent;btn.onclick=async()=>{const files=dz.getFiles();if(files.length!==1)return toast('Selecione um PDF ou imagem.',true);const fd=new FormData();fd.append('file',files[0]);setLoading(btn,true,'Executando OCR…');try{const res=await postForm('/api/ocr',fd);downloadBlob(await res.blob(),'pdf-pesquisavel.pdf');toast('OCR concluído com sucesso!')}catch(e){toast(e.message,true)}setLoading(btn,false)}};
RENDERERS.edit=root=>{const dz=makeDropzone(root,{accept:'.pdf',multiple:false,label:'Arraste um PDF'}),btn=makeButton(root,'Abrir editor');btn.dataset.label=btn.textContent;btn.onclick=async()=>{const files=dz.getFiles();if(files.length!==1)return toast('Selecione um PDF.',true);const fd=new FormData();fd.append('file',files[0]);setLoading(btn,true,'Carregando…');try{const res=await postForm('/api/inspect',fd),data=await res.json();root.innerHTML='';const grid=document.createElement('div');grid.className='pages-grid';data.thumbnails.forEach((src,i)=>{const p=document.createElement('div');p.className='page-thumb';p.innerHTML=`<img src="${src}"><div class="pnum">Página ${i+1}</div>`;grid.appendChild(p)});root.appendChild(grid);toast('Prévia carregada.')}catch(e){toast(e.message,true)}setLoading(btn,false)}};
RENDERERS.annotate=RENDERERS.edit;
