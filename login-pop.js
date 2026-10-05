/* Popup de connexion façon Alibaba — pour les actions qui demandent un compte.
   Usage : inclure <script src="/login-pop.js"></script> puis appeler prodiLoginPop().
   Google → OAuth Supabase (retour sur la page en cours) ; e-mail → lien magique. */
(function(){
  if(window.prodiLoginPop)return;   /* déjà chargé (inclusion statique + injection dynamique) */
  var SB='https://bvcgpdoukhcatjibmvnb.supabase.co';
  var K='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2Y2dwZG91a2hjYXRqaWJtdm5iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzg5MjgsImV4cCI6MjA4Nzg1NDkyOH0.Ip3ykSUS9sajTH04yXBerOG1haBKMD1kAvMQNjnGL1Q';
  var css=''
    +'#lgp-bg{position:fixed;inset:0;background:rgba(10,10,12,.55);-webkit-backdrop-filter:blur(2px);backdrop-filter:blur(2px);z-index:9500;display:none;align-items:center;justify-content:center;font-family:\'DM Sans\',-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,sans-serif;}'
    +'#lgp-bg.open{display:flex;}'
    +'.lgp-card{position:relative;width:min(1000px,92vw);min-height:min(600px,90vh);background:#fff;border-radius:18px;overflow:hidden;display:grid;grid-template-columns:1fr 1.05fr;box-shadow:0 30px 90px rgba(0,0,0,.35);animation:lgpUp .22s cubic-bezier(.4,0,.2,1);}'
    +'@keyframes lgpUp{from{transform:translateY(14px);opacity:0;}to{transform:none;opacity:1;}}'
    +'.lgp-left{position:relative;background:linear-gradient(160deg,#ff7a1a,#fe0000);min-height:100%;}'
    +'.lgp-left img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;}'
    +'.lgp-right{padding:58px 54px;display:flex;flex-direction:column;justify-content:center;}'
    +'.lgp-x{position:absolute;top:12px;right:14px;width:40px;height:40px;border:none;background:none;font-size:26px;line-height:1;cursor:pointer;color:#1d1d1f;z-index:5;}'
    +'.lgp-t{font-size:28px;font-weight:800;color:#111;margin-bottom:28px;line-height:1.25;}'
    +'.lgp-google{display:flex;align-items:center;justify-content:center;gap:12px;border:1.5px solid #d2d2d7;border-radius:10px;padding:13px;font-size:15.5px;font-weight:700;color:#111;text-decoration:none;cursor:pointer;background:#fff;}'
    +'.lgp-google:hover{background:#f5f5f7;}'
    +'.lgp-google svg{width:20px;height:20px;flex-shrink:0;}'
    +'.lgp-or{display:flex;align-items:center;gap:14px;color:#86868b;font-size:13px;font-weight:700;margin:24px 0;letter-spacing:1px;}'
    +'.lgp-or::before,.lgp-or::after{content:\'\';flex:1;height:1px;background:#e3e3e6;}'
    +'.lgp-mail{width:100%;box-sizing:border-box;border:1.5px solid #d2d2d7;border-radius:10px;padding:14px 16px;font:500 15.5px \'DM Sans\',sans-serif;color:#1d1d1f;outline:none;}'
    +'.lgp-mail:focus{border-color:#86868b;}'
    +'.lgp-go{width:100%;margin-top:12px;background:linear-gradient(90deg,#ff7a1a,#ff3c00 45%,#fe0000);color:#fff;border:none;border-radius:999px;padding:14px;font:800 16px \'DM Sans\',sans-serif;cursor:pointer;}'
    +'.lgp-go:hover{filter:brightness(.93);}'
    +'.lgp-msg{font-size:13.5px;font-weight:600;margin-top:12px;display:none;}'
    +'.lgp-msg.ok{display:block;color:#1a7a38;}'
    +'.lgp-msg.err{display:block;color:#c41b17;}'
    +'.lgp-alt{display:block;text-align:center;margin-top:22px;font-size:13.5px;font-weight:600;color:#6e6e73;text-decoration:none;}'
    +'.lgp-alt:hover{color:#111;text-decoration:underline;}'
    +'@media(max-width:820px){.lgp-card{grid-template-columns:1fr;}.lgp-left{display:none;}}';
  var st=document.createElement('style'); st.textContent=css; document.head.appendChild(st);

  var bg=document.createElement('div'); bg.id='lgp-bg';
  bg.innerHTML='<div class="lgp-card">'
    +'<button class="lgp-x" aria-label="Fermer">✕</button>'
    +'<div class="lgp-left"><img src="/img/compte_promo.webp" alt=""></div>'
    +'<div class="lgp-right">'
      +'<div class="lgp-t">Connectez-vous ou créez un compte</div>'
      +'<button class="lgp-google">'
        +'<svg viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>'
        +'Continuer avec Google'
      +'</button>'
      +'<div class="lgp-or">OU</div>'
      +'<input class="lgp-mail" type="email" placeholder="Saisissez votre e-mail" autocomplete="email">'
      +'<button class="lgp-go">Continuer</button>'
      +'<div class="lgp-msg"></div>'
    +'</div>'
  +'</div>';
  function mount(){ if(!bg.parentNode)document.body.appendChild(bg); }
  if(document.body)mount(); else document.addEventListener('DOMContentLoaded',mount);

  function close(){ bg.classList.remove('open'); }
  bg.addEventListener('click',function(e){if(e.target===bg)close();});
  bg.querySelector('.lgp-x').addEventListener('click',close);
  bg.querySelector('.lgp-google').addEventListener('click',function(){
    location.href=SB+'/auth/v1/authorize?provider=google&redirect_to='+encodeURIComponent(location.origin+location.pathname+location.search);
  });
  bg.querySelector('.lgp-go').addEventListener('click',function(){
    var mail=bg.querySelector('.lgp-mail').value.trim();
    var msg=bg.querySelector('.lgp-msg');
    msg.className='lgp-msg';
    if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail)){msg.textContent='Adresse e-mail invalide.';msg.classList.add('err');return;}
    fetch(SB+'/auth/v1/otp?redirect_to='+encodeURIComponent(location.origin+location.pathname+location.search),{
      method:'POST',
      headers:{apikey:K,'Content-Type':'application/json'},
      body:JSON.stringify({email:mail,create_user:true})
    }).then(function(r){
      if(r.ok){msg.textContent='Lien de connexion envoyé ! Vérifiez votre boîte mail (et les spams).';msg.classList.add('ok');}
      else{msg.textContent='Envoi impossible pour le moment — réessayez ou passez par Google.';msg.classList.add('err');}
    }).catch(function(){msg.textContent='Envoi impossible — vérifiez votre connexion.';msg.classList.add('err');});
  });

  window.prodiLoginPop=function(){ mount(); bg.classList.add('open'); };
  function logged(){
    try{var s=JSON.parse(localStorage.getItem('sb-bvcgpdoukhcatjibmvnb-auth-token')||'null');return !!(s&&s.user);}catch(e){return false;}
  }
  /* helper : true si connecté, sinon ouvre le popup et renvoie false */
  window.prodiRequireAccount=function(){
    if(logged())return true;
    window.prodiLoginPop(); return false;
  };

  /* INTERCEPTION GLOBALE : tout lien vers une zone à compte (/fabrication/, /echantillons/)
     ouvre le popup SUR PLACE si pas connecté — aucune navigation.
     Le catalogue est LIBRE d'accès (décision 24/09). */
  function gated(h){
    return /^\/(fabrication|echantillons)(\/|\?|$)/.test(h);
  }
  document.addEventListener('click',function(e){
    var a=e.target.closest&&e.target.closest('a[href]'); if(!a)return;
    if(!gated(a.getAttribute('href')||''))return;
    if(logged())return;
    e.preventDefault(); e.stopPropagation();
    window.prodiLoginPop();
  },true);
  document.addEventListener('submit',function(e){
    var f=e.target; if(!f||!f.getAttribute)return;
    if(!gated(f.getAttribute('action')||''))return;
    if(logged())return;
    e.preventDefault(); e.stopPropagation();
    window.prodiLoginPop();
  },true);
})();
