import { useState, useEffect, useRef } from "react";

const SUPABASE_URL = "https://gehxexhtdsfmniqextbs.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlaHhleGh0ZHNmbW5pcWV4dGJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyMzAxMjMsImV4cCI6MjA5NDgwNjEyM30.mDDV6aUdM7Gm_QioQMUseEnlK9E_z-RMVCsSlGYsS3I";

const api = (path, opts = {}) =>
  fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${opts.token || SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: opts.prefer || "return=representation",
      ...opts.headers,
    },
    ...opts,
  });

const authApi = (path, body, token) =>
  fetch(`${SUPABASE_URL}/auth/v1/${path}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  }).then(r => r.json());

const CATEGORIES = ["Food","Transport","Bills","Taxes","Shopping","Subscriptions","Bank Fees","Others"];
const INCOME_SOURCES = ["Salary","Freelance","Business","Investment","Gift","Other"];
const CAT_COLORS = {Food:"#F97316",Transport:"#3B82F6",Bills:"#8B5CF6",Taxes:"#EF4444",Shopping:"#EC4899",Subscriptions:"#06B6D4","Bank Fees":"#F59E0B",Others:"#6B7280"};
const CAT_ICONS = {Food:"🍔",Transport:"🚗",Bills:"⚡",Taxes:"🏛️",Shopping:"🛍️",Subscriptions:"📱","Bank Fees":"🏦",Others:"📦"};
const GOAL_ICONS = ["🏠","✈️","🚗","📱","💍","🎓","🏥","💻","🌴","💰","🎯","🛡️"];
const BILL_ICONS = ["⚡","💧","🌐","📱","🏠","🚗","🎬","🏥","📺","💳","🔔","📦"];
const REPEAT_OPTIONS = ["Once","Weekly","Monthly","Yearly"];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function getUserTimezone(){return Intl.DateTimeFormat().resolvedOptions().timeZone;}
function nowInTZ(tz){return new Date(new Date().toLocaleString("en-US",{timeZone:tz}));}
function formatDateTime(iso,tz){if(!iso)return "";try{return new Date(iso).toLocaleString("en-US",{timeZone:tz,month:"short",day:"numeric",year:"numeric",hour:"2-digit",minute:"2-digit",hour12:true});}catch{return iso;}}
function getTZAbbr(tz){try{return new Intl.DateTimeFormat("en-US",{timeZone:tz,timeZoneName:"short"}).formatToParts(new Date()).find(p=>p.type==="timeZoneName")?.value||tz;}catch{return tz;}}
function getMonthKey(iso,tz){if(!iso)return "";try{const d=new Date(new Date(iso).toLocaleString("en-US",{timeZone:tz}));return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;}catch{return iso.slice(0,7);}}
function timeAgo(iso,tz){const now=nowInTZ(tz),then=new Date(iso),diff=(now-then)/1000;if(diff<60)return "just now";if(diff<3600)return `${Math.floor(diff/60)}m ago`;if(diff<86400)return `${Math.floor(diff/3600)}h ago`;if(diff<604800)return `${Math.floor(diff/86400)}d ago`;return new Date(iso).toLocaleDateString("en-US",{timeZone:tz,month:"short",day:"numeric"});}
function daysUntil(d){return Math.ceil((new Date(d)-new Date())/(1000*60*60*24));}
function monthsLeft(d){const dd=new Date(d),n=new Date();return Math.max(1,(dd.getFullYear()-n.getFullYear())*12+(dd.getMonth()-n.getMonth()));}

function generateInsights(expenses,income,budgets,bills){
  const totalExp=expenses.reduce((s,e)=>s+e.amount,0);
  const totalInc=income.reduce((s,i)=>s+i.amount,0);
  const byCat={};expenses.forEach(e=>{byCat[e.cat]=(byCat[e.cat]||0)+e.amount;});
  const topCat=Object.entries(byCat).sort((a,b)=>b[1]-a[1])[0];
  const savingsRate=totalInc>0?((totalInc-totalExp)/totalInc*100).toFixed(0):0;
  const overBudget=budgets.filter(b=>byCat[b.cat]>b.limit_amount);
  const urgentBills=bills.filter(b=>!b.paid&&daysUntil(b.due_date)<=3);
  return [
    urgentBills.length>0?{icon:"🔔",text:`${urgentBills.length} bill(s) due within 3 days: ${urgentBills.map(b=>b.name).join(", ")}.`}:null,
    overBudget.length>0?{icon:"🚨",text:`Over budget: ${overBudget.map(b=>b.cat).join(", ")}.`}:null,
    topCat?{icon:"⚠️",text:`Highest spend: ${topCat[0]} at $${topCat[1].toFixed(2)}.`}:null,
    Number(savingsRate)<20?{icon:"💡",text:`Saving ${savingsRate}% of income. Target 20%+.`}:{icon:"✅",text:`Great! Saving ${savingsRate}% of income.`},
    {icon:"📈",text:`Weekly avg spend: $${(totalExp/4).toFixed(2)}. Monthly: $${totalExp.toFixed(2)}.`},
  ].filter(Boolean);
}

function MiniBar({value,max,color,h=6}){
  return <div style={{background:"#1a1f2e",borderRadius:4,height:h,overflow:"hidden",flex:1}}>
    <div style={{width:`${Math.min((value/max)*100,100)}%`,height:"100%",background:color,borderRadius:4,transition:"width 0.8s ease"}}/>
  </div>;
}
function GoalRing({pct,size=72,color="#22d3ee"}){
  const r=28,circ=2*Math.PI*r,stroke=6;
  return <svg width={size} height={size} style={{transform:"rotate(-90deg)"}}>
    <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1e293b" strokeWidth={stroke}/>
    <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeDasharray={circ} strokeDashoffset={circ*(1-Math.min(pct,1))} strokeLinecap="round" style={{transition:"stroke-dashoffset 1s ease"}}/>
  </svg>;
}
function LiveClock({tz}){
  const [t,setT]=useState(new Date());
  useEffect(()=>{const id=setInterval(()=>setT(new Date()),1000);return()=>clearInterval(id);},[]);
  return(
    <div style={{background:"#161b27",border:"1px solid #1e293b",borderRadius:14,padding:"14px 16px",marginBottom:12}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={{fontSize:11,color:"#64748b",letterSpacing:1,textTransform:"uppercase",marginBottom:2}}>Your Local Time</div>
          <div style={{fontSize:26,fontWeight:900,color:"#22d3ee",fontVariantNumeric:"tabular-nums"}}>{t.toLocaleTimeString("en-US",{timeZone:tz,hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:true})}</div>
          <div style={{fontSize:12,color:"#64748b",marginTop:2}}>{t.toLocaleDateString("en-US",{timeZone:tz,weekday:"short",month:"short",day:"numeric",year:"numeric"})}</div>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:11,color:"#64748b",marginBottom:4}}>Timezone</div>
          <div style={{background:"#22d3ee22",border:"1px solid #22d3ee44",borderRadius:8,padding:"4px 10px",fontSize:12,color:"#22d3ee",fontWeight:700}}>{getTZAbbr(tz)}</div>
          <div style={{fontSize:10,color:"#334155",marginTop:4,maxWidth:120,textAlign:"right"}}>{tz.replace(/_/g," ")}</div>
        </div>
      </div>
    </div>
  );
}
function Spinner(){
  return <div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:40}}>
    <div style={{width:32,height:32,border:"3px solid #1e293b",borderTop:"3px solid #22d3ee",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
  </div>;
}

function AuthScreen({onAuth}){
  const [mode,setMode]=useState("login");
  const [email,setEmail]=useState(""), [password,setPassword]=useState(""), [name,setName]=useState("");
  const [loading,setLoading]=useState(false), [error,setError]=useState("");
  const tz=getUserTimezone();

  const handle=async()=>{
    setError("");
    if(!email||!password){setError("Fill all fields.");return;}
    if(mode==="signup"&&!name){setError("Enter your name.");return;}
    if(password.length<6){setError("Password min 6 chars.");return;}
    setLoading(true);
    try{
      if(mode==="signup"){
        const r=await authApi("signup",{email,password,data:{name,timezone:tz}});
        if(r.error){setError(r.error.message);setLoading(false);return;}
        const r2=await authApi("token?grant_type=password",{email,password});
        if(r2.error){setError("Account created! Please sign in.");setMode("login");setLoading(false);return;}
        await api("profiles",{method:"POST",token:r2.access_token,body:JSON.stringify({id:r2.user.id,name,email,timezone:tz})});
        onAuth(r2.access_token,r2.user,{name,timezone:tz});
      } else {
        const r=await authApi("token?grant_type=password",{email,password});
        if(r.error){setError("Invalid email or password.");setLoading(false);return;}
        const pr=await api(`profiles?id=eq.${r.user.id}`,{token:r.access_token}).then(x=>x.json());
        onAuth(r.access_token,r.user,pr[0]||{name:email.split("@")[0],timezone:tz});
      }
    }catch(e){setError("Connection error. Check your internet.");}
    setLoading(false);
  };

  const si={width:"100%",background:"#0d1117",border:"1px solid #1e293b",borderRadius:10,padding:"12px 14px",color:"#e2e8f0",fontSize:14,marginBottom:12,boxSizing:"border-box",outline:"none"};
  return(
    <div style={{minHeight:"100vh",background:"#0d1117",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"0 24px",fontFamily:"'DM Sans','Segoe UI',sans-serif"}}>
      <div style={{width:200,height:200,background:"radial-gradient(circle,#22d3ee15,transparent 70%)",position:"absolute",top:60,left:"50%",transform:"translateX(-50%)",pointerEvents:"none"}}/>
      <div style={{fontSize:36,fontWeight:900,color:"#fff",marginBottom:4}}>Fin<span style={{color:"#22d3ee"}}>Track</span></div>
      <div style={{fontSize:12,color:"#475569",marginBottom:4}}>🌍 {tz.replace(/_/g," ")} ({getTZAbbr(tz)})</div>
      <div style={{fontSize:11,color:"#22d3ee",marginBottom:32,background:"#22d3ee11",padding:"4px 12px",borderRadius:20,border:"1px solid #22d3ee22"}}>AI-Powered Money Manager</div>
      <div style={{width:"100%",maxWidth:400,background:"#161b27",border:"1px solid #1e293b",borderRadius:20,padding:"28px 24px"}}>
        <div style={{fontSize:18,fontWeight:800,color:"#f1f5f9",marginBottom:20}}>{mode==="login"?"Welcome back 👋":"Create account ✨"}</div>
        {error&&<div style={{background:"#ef444422",border:"1px solid #ef444444",borderRadius:8,padding:"8px 12px",fontSize:12,color:"#fca5a5",marginBottom:12}}>{error}</div>}
        {mode==="signup"&&<input style={si} placeholder="Full name" value={name} onChange={e=>setName(e.target.value)}/>}
        <input style={si} placeholder="Email" type="email" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handle()}/>
        <input style={si} placeholder="Password (min 6)" type="password" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handle()}/>
        <button style={{width:"100%",padding:"13px",background:"linear-gradient(135deg,#22d3ee,#6366f1)",border:"none",borderRadius:12,color:"#fff",fontWeight:700,fontSize:15,cursor:"pointer"}} onClick={handle} disabled={loading}>
          {loading?"Please wait...":(mode==="login"?"Sign In":"Create Account")}
        </button>
        <div style={{textAlign:"center",marginTop:16,fontSize:13,color:"#64748b"}}>
          {mode==="login"?"No account?":"Have an account?"}
          <span style={{color:"#22d3ee",cursor:"pointer",fontWeight:600,marginLeft:4}} onClick={()=>{setMode(m=>m==="login"?"signup":"login");setError("");}}>
            {mode==="login"?" Sign up":" Sign in"}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function App(){
  const [token,setToken]=useState(()=>localStorage.getItem("ft_token"));
  const [user,setUser]=useState(()=>{try{return JSON.parse(localStorage.getItem("ft_user"));}catch{return null;}});
  const [profile,setProfile]=useState(()=>{try{return JSON.parse(localStorage.getItem("ft_profile"));}catch{return null;}});
  const [tab,setTab]=useState("dashboard");
  const [expenses,setExpenses]=useState([]);
  const [income,setIncome]=useState([]);
  const [goals,setGoals]=useState([]);
  const [bills,setBills]=useState([]);
  const [budgets,setBudgets]=useState([]);
  const [loading,setLoading]=useState(false);
  const [showExpForm,setShowExpForm]=useState(false);
  const [showIncForm,setShowIncForm]=useState(false);
  const [showGoalForm,setShowGoalForm]=useState(false);
  const [showBillForm,setShowBillForm]=useState(false);
  const [showBudgetForm,setShowBudgetForm]=useState(false);
  const [showAddSavings,setShowAddSavings]=useState(null);
  const [aiLoading,setAiLoading]=useState(false);
  const [aiChat,setAiChat]=useState([]);
  const [aiInput,setAiInput]=useState("");
  const [newExp,setNewExp]=useState({description:"",amount:"",cat:"Food"});
  const [newInc,setNewInc]=useState({description:"",amount:"",source:"Salary"});
  const [newGoal,setNewGoal]=useState({name:"",target:"",deadline:"",icon:"🎯",saved:""});
  const [newBill,setNewBill]=useState({name:"",amount:"",due_date:"",icon:"🔔",repeat:"Monthly",cat:"Bills"});
  const [editBudget,setEditBudget]=useState({});
  const [addAmt,setAddAmt]=useState("");
  const chatRef=useRef(null);

  const tz=profile?.timezone||getUserTimezone();
  const localNow=nowInTZ(tz);

  const handleAuth=async(tok,usr,prof)=>{
    setToken(tok);setUser(usr);setProfile(prof);
    localStorage.setItem("ft_token",tok);
    localStorage.setItem("ft_user",JSON.stringify(usr));
    localStorage.setItem("ft_profile",JSON.stringify(prof));
    await loadAll(tok,usr.id);
  };

  const loadAll=async(tok,uid)=>{
    setLoading(true);
    try{
      const [expR,incR,goalsR,billsR,budR]=await Promise.all([
        api(`expenses?user_id=eq.${uid}&order=timestamp.desc`,{token:tok}).then(r=>r.json()),
        api(`income?user_id=eq.${uid}&order=timestamp.desc`,{token:tok}).then(r=>r.json()),
        api(`goals?user_id=eq.${uid}&order=created_at.desc`,{token:tok}).then(r=>r.json()),
        api(`bills?user_id=eq.${uid}&order=due_date.asc`,{token:tok}).then(r=>r.json()),
        api(`budgets?user_id=eq.${uid}`,{token:tok}).then(r=>r.json()),
      ]);
      setExpenses(Array.isArray(expR)?expR:[]);
      setIncome(Array.isArray(incR)?incR:[]);
      setGoals(Array.isArray(goalsR)?goalsR:[]);
      setBills(Array.isArray(billsR)?billsR:[]);
      setBudgets(Array.isArray(budR)?budR:[]);
    }catch(e){console.error(e);}
    setLoading(false);
  };

  useEffect(()=>{
    if(token&&user){loadAll(token,user.id);}
  },[]);

  const signOut=()=>{
    localStorage.removeItem("ft_token");
    localStorage.removeItem("ft_user");
    localStorage.removeItem("ft_profile");
    setToken(null);setUser(null);setProfile(null);
    setExpenses([]);setIncome([]);setGoals([]);setBills([]);setBudgets([]);setAiChat([]);
  };

  const addExpense=async()=>{
    if(!newExp.description||!newExp.amount)return;
    const row={user_id:user.id,description:newExp.description,amount:parseFloat(newExp.amount),cat:newExp.cat,timestamp:new Date().toISOString()};
    const r=await api("expenses",{method:"POST",token,body:JSON.stringify(row)}).then(r=>r.json());
    if(Array.isArray(r)&&r[0])setExpenses(p=>[r[0],...p]);
    setNewExp({description:"",amount:"",cat:"Food"});setShowExpForm(false);
  };
  const deleteExpense=async(id)=>{await api(`expenses?id=eq.${id}`,{method:"DELETE",token});setExpenses(p=>p.filter(e=>e.id!==id));};

  const addIncome=async()=>{
    if(!newInc.description||!newInc.amount)return;
    const row={user_id:user.id,description:newInc.description,amount:parseFloat(newInc.amount),source:newInc.source,timestamp:new Date().toISOString()};
    const r=await api("income",{method:"POST",token,body:JSON.stringify(row)}).then(r=>r.json());
    if(Array.isArray(r)&&r[0])setIncome(p=>[r[0],...p]);
    setNewInc({description:"",amount:"",source:"Salary"});setShowIncForm(false);
  };
  const deleteIncome=async(id)=>{await api(`income?id=eq.${id}`,{method:"DELETE",token});setIncome(p=>p.filter(i=>i.id!==id));};

  const addGoal=async()=>{
    if(!newGoal.name||!newGoal.target||!newGoal.deadline)return;
    const row={user_id:user.id,name:newGoal.name,target:parseFloat(newGoal.target),saved:parseFloat(newGoal.saved||0),deadline:newGoal.deadline,icon:newGoal.icon};
    const r=await api("goals",{method:"POST",token,body:JSON.stringify(row)}).then(r=>r.json());
    if(Array.isArray(r)&&r[0])setGoals(p=>[r[0],...p]);
    setNewGoal({name:"",target:"",deadline:"",icon:"🎯",saved:""});setShowGoalForm(false);
  };
  const addToGoal=async(id)=>{
    const amt=parseFloat(addAmt);if(!amt||amt<=0)return;
    const goal=goals.find(g=>g.id===id);
    const newSaved=Math.min(goal.saved+amt,goal.target);
    await api(`goals?id=eq.${id}`,{method:"PATCH",token,body:JSON.stringify({saved:newSaved,last_added:new Date().toISOString()})});
    setGoals(p=>p.map(g=>g.id===id?{...g,saved:newSaved}:g));
    setAddAmt("");setShowAddSavings(null);
  };
  const deleteGoal=async(id)=>{await api(`goals?id=eq.${id}`,{method:"DELETE",token});setGoals(p=>p.filter(g=>g.id!==id));};

  const addBill=async()=>{
    if(!newBill.name||!newBill.amount||!newBill.due_date)return;
    const row={user_id:user.id,...newBill,amount:parseFloat(newBill.amount),paid:false};
    const r=await api("bills",{method:"POST",token,body:JSON.stringify(row)}).then(r=>r.json());
    if(Array.isArray(r)&&r[0])setBills(p=>[...p,r[0]].sort((a,b)=>new Date(a.due_date)-new Date(b.due_date)));
    setNewBill({name:"",amount:"",due_date:"",icon:"🔔",repeat:"Monthly",cat:"Bills"});setShowBillForm(false);
  };
  const markBillPaid=async(id)=>{
    const paidAt=new Date().toISOString();
    await api(`bills?id=eq.${id}`,{method:"PATCH",token,body:JSON.stringify({paid:true,paid_at:paidAt})});
    setBills(p=>p.map(b=>b.id===id?{...b,paid:true,paid_at:paidAt}:b));
  };
  const deleteBill=async(id)=>{await api(`bills?id=eq.${id}`,{method:"DELETE",token});setBills(p=>p.filter(b=>b.id!==id));};

  const saveBudgets=async()=>{
    for(const [cat,val] of Object.entries(editBudget)){
      const limit=parseFloat(val)||0;if(!limit)continue;
      const existing=budgets.find(b=>b.cat===cat);
      if(existing){
        await api(`budgets?id=eq.${existing.id}`,{method:"PATCH",token,body:JSON.stringify({limit_amount:limit})});
        setBudgets(p=>p.map(b=>b.id===existing.id?{...b,limit_amount:limit}:b));
      } else {
        const r=await api("budgets",{method:"POST",token,body:JSON.stringify({user_id:user.id,cat,limit_amount:limit})}).then(r=>r.json());
        if(Array.isArray(r)&&r[0])setBudgets(p=>[...p,r[0]]);
      }
    }
    setShowBudgetForm(false);
  };

  const askAI=async()=>{
    if(!aiInput.trim())return;
    const userMsg=aiInput.trim();setAiInput("");
    setAiChat(prev=>[...prev,{role:"user",text:userMsg}]);setAiLoading(true);
    const totalInc=income.reduce((s,i)=>s+i.amount,0);
    const totalExp=expenses.reduce((s,e)=>s+e.amount,0);
    const byCat={};expenses.forEach(e=>{byCat[e.cat]=(byCat[e.cat]||0)+e.amount;});
    const ctx=`User: ${profile?.name}, TZ: ${tz}. Income: $${totalInc}, Expenses: $${totalExp}, Balance: $${(totalInc-totalExp).toFixed(2)}. Categories: ${Object.entries(byCat).map(([k,v])=>`${k}:$${v.toFixed(0)}`).join(", ")}.`;
    try{
      const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,
          system:`You are FinTrack AI, a warm personal finance advisor. ${ctx} Give concise actionable advice in 2-3 sentences.`,
          messages:[...aiChat.map(m=>({role:m.role==="user"?"user":"assistant",content:m.text})),{role:"user",content:userMsg}]
        })});
      const data=await res.json();
      setAiChat(prev=>[...prev,{role:"ai",text:data.content?.[0]?.text||"Try again!"}]);
    }catch{setAiChat(prev=>[...prev,{role:"ai",text:"Connection error."}]);}
    setAiLoading(false);
  };

  useEffect(()=>{if(chatRef.current)chatRef.current.scrollTop=chatRef.current.scrollHeight;},[aiChat]);

  if(!token)return <AuthScreen onAuth={handleAuth}/>;
  if(loading)return(
    <div style={{minHeight:"100vh",background:"#0d1117",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontFamily:"'DM Sans','Segoe UI',sans-serif"}}>
      <div style={{fontSize:24,fontWeight:900,color:"#fff",marginBottom:20}}>Fin<span style={{color:"#22d3ee"}}>Track</span></div>
      <Spinner/>
      <div style={{color:"#64748b",fontSize:13,marginTop:12}}>Loading your data...</div>
    </div>
  );

  const totalIncome=income.reduce((s,i)=>s+i.amount,0);
  const totalExpenses=expenses.reduce((s,e)=>s+e.amount,0);
  const balance=totalIncome-totalExpenses;
  const byCat={};expenses.forEach(e=>{byCat[e.cat]=(byCat[e.cat]||0)+e.amount;});
  const catTotals=CATEGORIES.map(c=>({cat:c,value:byCat[c]||0,color:CAT_COLORS[c]})).filter(c=>c.value>0);
  const curMonthKey=`${localNow.getFullYear()}-${String(localNow.getMonth()+1).padStart(2,"0")}`;
  const thisMonthExpTotal=expenses.filter(e=>getMonthKey(e.timestamp,tz)===curMonthKey).reduce((s,e)=>s+e.amount,0);
  const thisMonthIncTotal=income.filter(i=>getMonthKey(i.timestamp,tz)===curMonthKey).reduce((s,i)=>s+i.amount,0);
  const insights=generateInsights(expenses,income,budgets,bills);
  const unpaidBills=bills.filter(b=>!b.paid).sort((a,b)=>new Date(a.due_date)-new Date(b.due_date));
  const paidBills=bills.filter(b=>b.paid);
  const totalDue=unpaidBills.reduce((s,b)=>s+b.amount,0);
  const urgentBills=unpaidBills.filter(b=>daysUntil(b.due_date)<=3);
  const budgetStatus=CATEGORIES.map(cat=>{
    const b=budgets.find(x=>x.cat===cat);if(!b)return null;
    const spent=byCat[cat]||0,limit=b.limit_amount,pct=limit>0?spent/limit:0;
    return {cat,spent,limit,pct,over:spent>limit,near:pct>=0.8&&pct<1,id:b.id};
  }).filter(Boolean);

  const inp={width:"100%",background:"#0d1117",border:"1px solid #1e293b",borderRadius:10,padding:"11px 14px",color:"#e2e8f0",fontSize:14,marginBottom:10,boxSizing:"border-box",outline:"none"};
  const btn={width:"100%",padding:"13px",background:"linear-gradient(135deg,#22d3ee,#6366f1)",border:"none",borderRadius:12,color:"#fff",fontWeight:700,fontSize:15,cursor:"pointer",marginTop:4};
  const btnOut={width:"100%",padding:"11px",background:"transparent",border:"1px solid #1e293b",borderRadius:12,color:"#94a3b8",fontWeight:600,fontSize:14,cursor:"pointer",marginTop:8};
  const card={background:"#161b27",border:"1px solid #1e293b",borderRadius:16,padding:"16px"};
  const txRow={display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:"1px solid #1e293b22"};
  const sec={fontSize:11,fontWeight:800,color:"#64748b",letterSpacing:1.5,textTransform:"uppercase",marginBottom:10};
  const hero={margin:"18px 16px 0",background:"linear-gradient(135deg,#1e293b,#0f172a)",border:"1px solid #1e3a5f",borderRadius:20,padding:"22px 20px",position:"relative",overflow:"hidden"};
  const glw={position:"absolute",top:-40,right:-40,width:140,height:140,background:"radial-gradient(circle,#22d3ee22,transparent 70%)",pointerEvents:"none"};
  const modal={position:"fixed",inset:0,background:"#000000cc",zIndex:300,display:"flex",alignItems:"flex-end",justifyContent:"center"};
  const modalBox={background:"#161b27",borderRadius:"20px 20px 0 0",padding:"24px 20px 40px",width:"100%",maxWidth:430,border:"1px solid #1e293b"};
  const billColor=(b)=>{const d=daysUntil(b.due_date);return d<0?"#ef4444":d<=3?"#f97316":d<=7?"#f59e0b":"#22d3ee";};
  const billLabel=(b)=>{const d=daysUntil(b.due_date);return d<0?`${Math.abs(d)}d overdue`:d===0?"Due today!":d===1?"Due tomorrow":`Due in ${d}d`;};

  const tabs=[
    {id:"dashboard",icon:"⊞",label:"Home"},
    {id:"bills",icon:"🔔",label:"Bills"},
    {id:"budget",icon:"💰",label:"Budget"},
    {id:"expenses",icon:"↓",label:"Expenses"},
    {id:"ai",icon:"✦",label:"AI"},
  ];

  return(
    <div style={{fontFamily:"'DM Sans','Segoe UI',sans-serif",background:"#0d1117",minHeight:"100vh",color:"#e2e8f0",maxWidth:430,margin:"0 auto",overflowX:"hidden"}}>
      <div style={{padding:"18px 20px 0",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{fontSize:20,fontWeight:900,color:"#fff"}}>Fin<span style={{color:"#22d3ee"}}>Track</span></div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          {urgentBills.length>0&&<div style={{background:"#f9731622",border:"1px solid #f9731644",borderRadius:20,padding:"3px 10px",fontSize:11,color:"#f97316",fontWeight:700}}>🔔 {urgentBills.length}</div>}
          <div style={{fontSize:10,color:"#64748b",background:"#1e293b",padding:"3px 8px",borderRadius:10}}>{getTZAbbr(tz)}</div>
          <button onClick={signOut} style={{background:"#1e293b",border:"1px solid #334155",borderRadius:20,padding:"5px 12px",color:"#94a3b8",fontSize:11,fontWeight:700,cursor:"pointer"}}>Sign out</button>
        </div>
      </div>

      {tab==="dashboard"&&<div style={{paddingBottom:100}}>
        <div style={{margin:"16px 16px 0"}}><LiveClock tz={tz}/></div>
        {urgentBills.length>0&&<div style={{margin:"12px 16px 0",background:"#f9731618",border:"1px solid #f9731644",borderRadius:14,padding:"12px 14px"}}>
          <div style={{fontSize:12,fontWeight:700,color:"#f97316",marginBottom:6}}>🔔 Bills Due Soon</div>
          {urgentBills.map(b=><div key={b.id} style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:12,color:"#fed7aa"}}>{b.icon} {b.name}</span><span style={{fontSize:12,fontWeight:700,color:"#f97316"}}>${b.amount} · {billLabel(b)}</span></div>)}
          <button onClick={()=>setTab("bills")} style={{marginTop:8,background:"none",border:"1px solid #f9731644",borderRadius:8,padding:"5px 12px",color:"#f97316",fontSize:11,fontWeight:700,cursor:"pointer"}}>View all →</button>
        </div>}
        {budgetStatus.filter(b=>b.over).length>0&&<div style={{margin:"10px 16px 0",background:"#ef444418",border:"1px solid #ef444444",borderRadius:14,padding:"12px 14px"}}>
          <div style={{fontSize:12,fontWeight:700,color:"#ef4444",marginBottom:6}}>🚨 Over Budget</div>
          {budgetStatus.filter(b=>b.over).map(b=><div key={b.cat} style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{fontSize:12,color:"#fca5a5"}}>{CAT_ICONS[b.cat]} {b.cat}</span><span style={{fontSize:12,fontWeight:700,color:"#ef4444"}}>${b.spent.toFixed(0)}/${b.limit}</span></div>)}
        </div>}
        <div style={hero}>
          <div style={glw}/>
          <div style={{fontSize:11,color:"#64748b",letterSpacing:1.5,textTransform:"uppercase",marginBottom:6}}>Total Balance</div>
          <div style={{fontSize:36,fontWeight:900,color:balance>=0?"#22d3ee":"#f87171"}}>${balance.toFixed(2)}</div>
          <div style={{display:"flex",gap:16,marginTop:18}}>
            <div style={{flex:1,background:"#ffffff08",borderRadius:12,padding:"10px 14px"}}><div style={{fontSize:10,color:"#64748b",textTransform:"uppercase",letterSpacing:1}}>Income</div><div style={{fontSize:18,fontWeight:700,marginTop:2,color:"#4ade80"}}>+${totalIncome.toFixed(0)}</div></div>
            <div style={{flex:1,background:"#ffffff08",borderRadius:12,padding:"10px 14px"}}><div style={{fontSize:10,color:"#64748b",textTransform:"uppercase",letterSpacing:1}}>Expenses</div><div style={{fontSize:18,fontWeight:700,marginTop:2,color:"#f87171"}}>-${totalExpenses.toFixed(2)}</div></div>
          </div>
        </div>
        <div style={{margin:"18px 16px 0"}}>
          <div style={sec}>This Month · {MONTHS[localNow.getMonth()]} {localNow.getFullYear()}</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            {[{label:"Earned",val:`$${thisMonthIncTotal.toFixed(0)}`,color:"#4ade80",icon:"💰"},{label:"Spent",val:`$${thisMonthExpTotal.toFixed(0)}`,color:"#f87171",icon:"💸"},{label:"Bills Due",val:`$${totalDue.toFixed(0)}`,color:"#f97316",icon:"🔔"},{label:"Saved",val:`$${(thisMonthIncTotal-thisMonthExpTotal).toFixed(0)}`,color:"#22d3ee",icon:"🏦"}].map(s=>(
              <div key={s.label} style={{...card,padding:"12px 14px"}}><div style={{fontSize:18,marginBottom:4}}>{s.icon}</div><div style={{fontSize:10,color:"#64748b",textTransform:"uppercase",letterSpacing:1}}>{s.label}</div><div style={{fontSize:20,fontWeight:800,color:s.color,marginTop:2}}>{s.val}</div></div>
            ))}
          </div>
        </div>
        {goals.length>0&&<div style={{margin:"18px 16px 0"}}>
          <div style={{...sec,display:"flex",justifyContent:"space-between",alignItems:"center"}}><span>Goals</span><button onClick={()=>setTab("goals")} style={{background:"none",border:"none",color:"#22d3ee",fontSize:11,fontWeight:700,cursor:"pointer"}}>View all →</button></div>
          <div style={{display:"flex",gap:10,overflowX:"auto",paddingBottom:4}}>
            {goals.map(g=>{const pct=g.saved/g.target;return(
              <div key={g.id} onClick={()=>setTab("goals")} style={{minWidth:140,background:"#161b27",border:"1px solid #1e293b",borderRadius:16,padding:"14px",cursor:"pointer",flexShrink:0}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}><span style={{fontSize:18}}>{g.icon}</span><div style={{fontSize:12,fontWeight:700,color:"#e2e8f0"}}>{g.name}</div></div>
                <div style={{position:"relative",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:6}}><GoalRing pct={pct} size={60} color={pct>=1?"#4ade80":"#a78bfa"}/><div style={{position:"absolute",fontSize:11,fontWeight:800,color:"#f1f5f9"}}>{Math.round(pct*100)}%</div></div>
                <div style={{fontSize:10,color:"#64748b",textAlign:"center"}}>${g.saved.toFixed(0)} / ${g.target.toFixed(0)}</div>
              </div>
            );})}
          </div>
        </div>}
        <div style={{margin:"18px 16px 0"}}>
          <div style={sec}>AI Insights</div>
          {insights.slice(0,3).map((ins,i)=>(
            <div key={i} style={{background:"#161b27",border:"1px solid #1e293b",borderRadius:12,padding:"12px 14px",marginBottom:8,display:"flex",gap:10}}>
              <span style={{fontSize:16}}>{ins.icon}</span><span style={{fontSize:13,color:"#cbd5e1",lineHeight:1.5}}>{ins.text}</span>
            </div>
          ))}
          <button onClick={()=>setTab("ai")} style={{...btnOut,marginTop:0}}>Chat with AI Advisor →</button>
        </div>
        <div style={{margin:"18px 16px 0"}}>
          <div style={{...sec,display:"flex",justifyContent:"space-between",alignItems:"center"}}><span>Recent Transactions</span><button onClick={()=>setShowExpForm(true)} style={{background:"linear-gradient(135deg,#22d3ee,#6366f1)",border:"none",borderRadius:20,padding:"5px 12px",color:"#fff",fontSize:11,fontWeight:700,cursor:"pointer"}}>+ Add</button></div>
          <div style={card}>
            {expenses.length===0?<div style={{textAlign:"center",color:"#334155",padding:"24px 0",fontSize:13}}>No expenses yet. Tap + Add to start.</div>:
            expenses.slice(0,5).map(e=>(
              <div key={e.id} style={txRow}>
                <div style={{width:36,height:36,borderRadius:10,background:CAT_COLORS[e.cat]+"22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{CAT_ICONS[e.cat]}</div>
                <div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:600,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{e.description}</div><div style={{fontSize:10,color:"#64748b",marginTop:1}}>{e.cat} · {timeAgo(e.timestamp,tz)}</div></div>
                <div style={{fontSize:14,fontWeight:700,color:"#f87171",flexShrink:0}}>-${e.amount.toFixed(2)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>}

      {tab==="bills"&&<div style={{paddingBottom:100}}>
        <div style={{margin:"18px 16px 0",display:"flex",justifyContent:"space-between",alignItems:"center"}}><div style={sec}>Bill Reminders</div><button onClick={()=>setShowBillForm(true)} style={{background:"linear-gradient(135deg,#f97316,#ef4444)",border:"none",borderRadius:20,padding:"6px 14px",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer"}}>+ Add Bill</button></div>
        <div style={{margin:"0 16px 16px",background:"linear-gradient(135deg,#1e293b,#0f172a)",border:"1px solid #1e3a5f",borderRadius:16,padding:"16px 18px"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
            {[{label:"Total Due",val:`$${totalDue.toFixed(0)}`,color:"#f87171"},{label:"Unpaid",val:unpaidBills.length,color:"#f97316"},{label:"Urgent",val:urgentBills.length,color:urgentBills.length>0?"#ef4444":"#4ade80"}].map(s=>(
              <div key={s.label} style={{background:"#ffffff06",borderRadius:10,padding:"10px 12px",textAlign:"center"}}><div style={{fontSize:10,color:"#64748b",textTransform:"uppercase",letterSpacing:1}}>{s.label}</div><div style={{fontSize:20,fontWeight:800,color:s.color,marginTop:3}}>{s.val}</div></div>
            ))}
          </div>
        </div>
        <div style={{margin:"0 16px"}}>
          {unpaidBills.length===0?<div style={{...card,textAlign:"center",padding:"32px 20px",marginBottom:12}}><div style={{fontSize:32,marginBottom:8}}>✅</div><div style={{fontSize:14,fontWeight:700,color:"#4ade80"}}>All bills paid!</div></div>:
          unpaidBills.map(b=>{const c=billColor(b),d=daysUntil(b.due_date);return(
            <div key={b.id} style={{...card,marginBottom:10,border:`1px solid ${d<=3?"#f9731633":"#1e293b"}`}}>
              <div style={{display:"flex",gap:12,alignItems:"center"}}>
                <div style={{width:44,height:44,borderRadius:12,background:c+"22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>{b.icon}</div>
                <div style={{flex:1}}><div style={{fontSize:14,fontWeight:800,color:"#f1f5f9"}}>{b.name}</div><div style={{fontSize:11,color:c,fontWeight:700,marginTop:2}}>{billLabel(b)}</div><div style={{fontSize:10,color:"#64748b",marginTop:1}}>{b.repeat} · {b.due_date}</div></div>
                <div style={{textAlign:"right",flexShrink:0}}><div style={{fontSize:18,fontWeight:900,color:"#f87171"}}>${b.amount}</div><button onClick={()=>deleteBill(b.id)} style={{background:"none",border:"none",color:"#334155",cursor:"pointer",fontSize:11,marginTop:2}}>✕</button></div>
              </div>
              <button onClick={()=>markBillPaid(b.id)} style={{width:"100%",marginTop:12,padding:"9px",background:"#4ade8022",border:"1px solid #4ade8044",borderRadius:10,color:"#4ade80",fontSize:13,fontWeight:700,cursor:"pointer"}}>✓ Mark as Paid</button>
            </div>
          );})}
          {paidBills.length>0&&<><div style={{...sec,marginTop:16}}>Paid</div>{paidBills.map(b=>(
            <div key={b.id} style={{...card,marginBottom:8,opacity:0.6}}>
              <div style={{display:"flex",gap:12,alignItems:"center"}}>
                <div style={{width:36,height:36,borderRadius:10,background:"#4ade8022",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>{b.icon}</div>
                <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,color:"#94a3b8",textDecoration:"line-through"}}>{b.name}</div><div style={{fontSize:10,color:"#4ade80",marginTop:1}}>✓ Paid {b.paid_at?timeAgo(b.paid_at,tz):""}</div></div>
                <div style={{fontSize:14,fontWeight:700,color:"#4ade80"}}>${b.amount}</div>
                <button onClick={()=>deleteBill(b.id)} style={{background:"none",border:"none",color:"#334155",cursor:"pointer",fontSize:14}}>✕</button>
              </div>
            </div>
          ))}</>}
        </div>
      </div>}

      {tab==="budget"&&<div style={{paddingBottom:100}}>
        <div style={{margin:"18px 16px 0",display:"flex",justifyContent:"space-between",alignItems:"center"}}><div style={sec}>Budget Limits</div><button onClick={()=>{const eb={};budgets.forEach(b=>{eb[b.cat]=b.limit_amount;});setEditBudget(eb);setShowBudgetForm(true);}} style={{background:"linear-gradient(135deg,#22d3ee,#6366f1)",border:"none",borderRadius:20,padding:"6px 14px",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer"}}>✏ Edit</button></div>
        <div style={{margin:"0 16px"}}>
          {budgetStatus.length===0?<div style={{...card,textAlign:"center",padding:"40px 20px"}}><div style={{fontSize:40,marginBottom:12}}>💰</div><div style={{fontSize:15,fontWeight:700,color:"#e2e8f0",marginBottom:6}}>No budgets set</div><button onClick={()=>{setEditBudget({});setShowBudgetForm(true);}} style={{...btn,width:"auto",padding:"10px 24px",marginTop:0}}>Set Limits</button></div>:
          budgetStatus.map(b=>{const remaining=b.limit-b.spent;return(
            <div key={b.cat} style={{...card,marginBottom:10,border:`1px solid ${b.over?"#ef444433":b.near?"#f59e0b33":"#1e293b"}`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <div style={{width:36,height:36,borderRadius:10,background:CAT_COLORS[b.cat]+"22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>{CAT_ICONS[b.cat]}</div>
                  <div><div style={{fontSize:14,fontWeight:700,color:"#f1f5f9"}}>{b.cat}</div><div style={{fontSize:10,color:"#64748b"}}>${b.spent.toFixed(0)} of ${b.limit}</div></div>
                </div>
                <div style={{textAlign:"right"}}><div style={{fontSize:16,fontWeight:900,color:b.over?"#ef4444":b.near?"#f59e0b":"#4ade80"}}>{Math.round(b.pct*100)}%</div><div style={{fontSize:10,color:b.over?"#ef4444":"#64748b"}}>{b.over?`$${Math.abs(remaining).toFixed(0)} over`:`$${remaining.toFixed(0)} left`}</div></div>
              </div>
              <MiniBar value={b.spent} max={b.limit} color={b.over?"#ef4444":b.near?"#f59e0b":"#4ade80"} h={8}/>
              {b.over&&<div style={{fontSize:11,color:"#ef4444",marginTop:6,background:"#ef444411",borderRadius:8,padding:"6px 10px"}}>🚨 Over budget by ${Math.abs(remaining).toFixed(2)}</div>}
              {b.near&&!b.over&&<div style={{fontSize:11,color:"#f59e0b",marginTop:6,background:"#f59e0b11",borderRadius:8,padding:"6px 10px"}}>⚡ ${remaining.toFixed(2)} remaining</div>}
            </div>
          );})}
        </div>
      </div>}

      {tab==="expenses"&&<div style={{paddingBottom:100}}>
        <div style={{margin:"18px 16px 0",display:"flex",justifyContent:"space-between",alignItems:"center"}}><div style={sec}>All Expenses</div><button onClick={()=>setShowExpForm(true)} style={{background:"linear-gradient(135deg,#22d3ee,#6366f1)",border:"none",borderRadius:20,padding:"6px 14px",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer"}}>+ Add</button></div>
        {catTotals.length>0&&<div style={{margin:"10px 16px 0",display:"flex",gap:6,flexWrap:"wrap"}}>{catTotals.map(c=><div key={c.cat} style={{padding:"4px 10px",borderRadius:20,background:c.color+"22",border:`1px solid ${c.color}44`,fontSize:11,color:c.color,fontWeight:600}}>{CAT_ICONS[c.cat]} {c.cat} ${c.value.toFixed(0)}</div>)}</div>}
        <div style={{margin:"12px 16px 0"}}>
          <div style={card}>
            {expenses.length===0?<div style={{textAlign:"center",color:"#334155",padding:"32px 0",fontSize:13}}>No expenses yet.</div>:
            expenses.map(e=>(
              <div key={e.id} style={txRow}>
                <div style={{width:36,height:36,borderRadius:10,background:CAT_COLORS[e.cat]+"22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{CAT_ICONS[e.cat]}</div>
                <div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:600,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{e.description}</div><div style={{fontSize:10,color:"#475569",marginTop:1}}>{formatDateTime(e.timestamp,tz)}</div></div>
                <div style={{fontSize:14,fontWeight:700,color:"#f87171",marginRight:6,flexShrink:0}}>-${e.amount.toFixed(2)}</div>
                <button onClick={()=>deleteExpense(e.id)} style={{background:"none",border:"none",color:"#475569",cursor:"pointer",fontSize:14}}>✕</button>
              </div>
            ))}
          </div>
        </div>
      </div>}

      {tab==="goals"&&<div style={{paddingBottom:100}}>
        <div style={{margin:"18px 16px 0",display:"flex",justifyContent:"space-between",alignItems:"center"}}><div style={sec}>Savings Goals</div><button onClick={()=>setShowGoalForm(true)} style={{background:"linear-gradient(135deg,#a78bfa,#6366f1)",border:"none",borderRadius:20,padding:"6px 14px",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer"}}>+ New Goal</button></div>
        <div style={{margin:"0 16px"}}>
          {goals.length===0?<div style={{...card,textAlign:"center",padding:"40px 20px"}}><div style={{fontSize:40,marginBottom:12}}>🎯</div><div style={{fontSize:15,fontWeight:700,color:"#e2e8f0",marginBottom:6}}>No goals yet</div><button onClick={()=>setShowGoalForm(true)} style={{...btn,width:"auto",padding:"10px 24px",marginTop:0}}>Create Goal</button></div>:
          goals.map(g=>{const pct=g.saved/g.target,dl=Math.max(0,Math.ceil((new Date(g.deadline)-new Date())/(1000*60*60*24))),ml=monthsLeft(g.deadline),done=pct>=1;return(
            <div key={g.id} style={{...card,marginBottom:12,position:"relative"}}>
              <button onClick={()=>deleteGoal(g.id)} style={{position:"absolute",top:12,right:12,background:"none",border:"none",color:"#334155",cursor:"pointer",fontSize:14}}>✕</button>
              <div style={{display:"flex",gap:14,alignItems:"center"}}>
                <div style={{position:"relative",flexShrink:0}}><GoalRing pct={pct} size={80} color={done?"#4ade80":"#a78bfa"}/><div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontSize:22}}>{g.icon}</span></div></div>
                <div style={{flex:1}}>
                  <div style={{fontSize:15,fontWeight:800,color:"#f1f5f9",marginBottom:2}}>{g.name}</div>
                  <div style={{fontSize:12,color:"#64748b",marginBottom:6}}>{done?"🎉 Goal reached!":`${dl} days left · ${Math.round(pct*100)}% done`}</div>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:12,color:"#a78bfa",fontWeight:700}}>${g.saved.toFixed(0)} saved</span><span style={{fontSize:12,color:"#64748b"}}>of ${g.target.toFixed(0)}</span></div>
                  <div style={{background:"#1a1f2e",borderRadius:4,height:6,overflow:"hidden"}}><div style={{width:`${Math.min(pct*100,100)}%`,height:"100%",background:done?"linear-gradient(90deg,#4ade80,#22d3ee)":"linear-gradient(90deg,#a78bfa,#6366f1)",borderRadius:4}}/></div>
                  {!done&&<div style={{fontSize:11,color:"#64748b",marginTop:4}}>Save ${((g.target-g.saved)/Math.max(ml,1)).toFixed(0)}/month to reach goal</div>}
                </div>
              </div>
              {!done&&<button onClick={()=>{setShowAddSavings(g.id);setAddAmt("");}} style={{width:"100%",marginTop:14,padding:"9px",background:"#a78bfa22",border:"1px solid #a78bfa44",borderRadius:10,color:"#a78bfa",fontSize:13,fontWeight:700,cursor:"pointer"}}>+ Add Savings</button>}
              {done&&<div style={{marginTop:12,padding:"10px",background:"#4ade8022",border:"1px solid #4ade8044",borderRadius:10,textAlign:"center",fontSize:13,color:"#4ade80",fontWeight:700}}>🎉 Goal complete!</div>}
            </div>
          );})}
        </div>
      </div>}

      {tab==="ai"&&<div style={{paddingBottom:100}}>
        <div style={{margin:"18px 16px 0"}}>
          <div style={sec}>AI Financial Advisor</div>
          <div style={{...card,marginBottom:12}}>
            <div style={{fontSize:11,color:"#64748b",marginBottom:8,fontWeight:700,letterSpacing:1}}>QUICK INSIGHTS</div>
            {insights.map((ins,i)=><div key={i} style={{background:"#0d1117",borderRadius:10,padding:"10px 12px",marginBottom:6,display:"flex",gap:10}}><span style={{fontSize:14}}>{ins.icon}</span><span style={{fontSize:12,color:"#cbd5e1",lineHeight:1.5}}>{ins.text}</span></div>)}
          </div>
          <div style={card}>
            <div style={{fontSize:11,color:"#64748b",marginBottom:10,fontWeight:700,letterSpacing:1}}>CHAT WITH FINTRACK AI</div>
            <div ref={chatRef} style={{height:280,overflowY:"auto",padding:"4px 0"}}>
              {aiChat.length===0&&<div style={{textAlign:"center",color:"#334155",padding:"30px 0"}}><div style={{fontSize:28,marginBottom:8}}>✦</div><div style={{fontSize:13,color:"#475569"}}>Ask me anything about your finances</div></div>}
              {aiChat.map((m,i)=>(
                <div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start",marginBottom:10}}>
                  <div style={{maxWidth:"82%",padding:"10px 14px",borderRadius:m.role==="user"?"16px 16px 4px 16px":"16px 16px 16px 4px",background:m.role==="user"?"linear-gradient(135deg,#22d3ee,#6366f1)":"#1e293b",fontSize:13,lineHeight:1.5,color:"#f1f5f9"}}>{m.text}</div>
                </div>
              ))}
              {aiLoading&&<div style={{display:"flex",justifyContent:"flex-start",marginBottom:10}}><div style={{padding:"10px 14px",borderRadius:"16px 16px 16px 4px",background:"#1e293b",fontSize:13,color:"#64748b"}}>Analyzing...</div></div>}
            </div>
            <div style={{display:"flex",gap:8,marginTop:10}}>
              <input style={{flex:1,background:"#0d1117",border:"1px solid #1e293b",borderRadius:10,padding:"10px 14px",color:"#e2e8f0",fontSize:13,outline:"none"}} value={aiInput} onChange={e=>setAiInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&askAI()} placeholder="Ask your AI advisor..."/>
              <button onClick={askAI} style={{width:40,height:40,borderRadius:10,background:"linear-gradient(135deg,#22d3ee,#6366f1)",border:"none",color:"#fff",fontSize:16,cursor:"pointer"}}>→</button>
            </div>
          </div>
        </div>
      </div>}

      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:430,background:"#0d1117",borderTop:"1px solid #1e293b",display:"flex",zIndex:200}}>
        {tabs.map(t=>(
          <button key={t.id} style={{flex:1,padding:"12px 0 14px",background:"none",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:3,position:"relative"}} onClick={()=>setTab(t.id)}>
            {t.id==="bills"&&urgentBills.length>0&&<div style={{position:"absolute",top:8,right:"50%",marginRight:-18,width:8,height:8,borderRadius:"50%",background:"#f97316"}}/>}
            <span style={{fontSize:18,opacity:tab===t.id?1:0.3}}>{t.icon}</span>
            <span style={{fontSize:9,letterSpacing:0.5,textTransform:"uppercase",fontWeight:700,color:tab===t.id?"#22d3ee":"#475569"}}>{t.label}</span>
          </button>
        ))}
      </div>

      {showExpForm&&<div style={modal} onClick={e=>e.target===e.currentTarget&&setShowExpForm(false)}>
        <div style={modalBox}>
          <div style={{fontSize:16,fontWeight:700,marginBottom:4,color:"#f1f5f9"}}>Add Expense</div>
          <div style={{fontSize:11,color:"#22d3ee",marginBottom:14}}>🕐 {formatDateTime(new Date().toISOString(),tz)} · {getTZAbbr(tz)}</div>
          <input style={inp} placeholder="Description" value={newExp.description} onChange={e=>setNewExp(p=>({...p,description:e.target.value}))}/>
          <input style={inp} placeholder="Amount ($)" type="number" value={newExp.amount} onChange={e=>setNewExp(p=>({...p,amount:e.target.value}))}/>
          <select style={inp} value={newExp.cat} onChange={e=>setNewExp(p=>({...p,cat:e.target.value}))}>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select>
          <button style={btn} onClick={addExpense}>Save Expense</button>
          <button style={btnOut} onClick={()=>setShowExpForm(false)}>Cancel</button>
        </div>
      </div>}

      {showIncForm&&<div style={modal} onClick={e=>e.target===e.currentTarget&&setShowIncForm(false)}>
        <div style={modalBox}>
          <div style={{fontSize:16,fontWeight:700,marginBottom:4,color:"#f1f5f9"}}>Add Income</div>
          <div style={{fontSize:11,color:"#4ade80",marginBottom:14}}>🕐 {formatDateTime(new Date().toISOString(),tz)} · {getTZAbbr(tz)}</div>
          <input style={inp} placeholder="Description" value={newInc.description} onChange={e=>setNewInc(p=>({...p,description:e.target.value}))}/>
          <input style={inp} placeholder="Amount ($)" type="number" value={newInc.amount} onChange={e=>setNewInc(p=>({...p,amount:e.target.value}))}/>
          <select style={inp} value={newInc.source} onChange={e=>setNewInc(p=>({...p,source:e.target.value}))}>{INCOME_SOURCES.map(s=><option key={s}>{s}</option>)}</select>
          <button style={{...btn,background:"linear-gradient(135deg,#4ade80,#22d3ee)",color:"#0d1117"}} onClick={addIncome}>Save Income</button>
          <button style={btnOut} onClick={()=>setShowIncForm(false)}>Cancel</button>
        </div>
      </div>}

      {showGoalForm&&<div style={modal} onClick={e=>e.target===e.currentTarget&&setShowGoalForm(false)}>
        <div style={modalBox}>
          <div style={{fontSize:16,fontWeight:700,marginBottom:16,color:"#f1f5f9"}}>New Savings Goal</div>
          <div style={{marginBottom:10}}><div style={{fontSize:11,color:"#64748b",marginBottom:6,fontWeight:600}}>ICON</div><div style={{display:"flex",flexWrap:"wrap",gap:8}}>{GOAL_ICONS.map(ic=><button key={ic} onClick={()=>setNewGoal(p=>({...p,icon:ic}))} style={{width:36,height:36,borderRadius:10,border:`2px solid ${newGoal.icon===ic?"#a78bfa":"#1e293b"}`,background:newGoal.icon===ic?"#a78bfa22":"#0d1117",fontSize:18,cursor:"pointer"}}>{ic}</button>)}</div></div>
          <input style={inp} placeholder="Goal name" value={newGoal.name} onChange={e=>setNewGoal(p=>({...p,name:e.target.value}))}/>
          <input style={inp} placeholder="Target ($)" type="number" value={newGoal.target} onChange={e=>setNewGoal(p=>({...p,target:e.target.value}))}/>
          <input style={inp} placeholder="Already saved ($)" type="number" value={newGoal.saved} onChange={e=>setNewGoal(p=>({...p,saved:e.target.value}))}/>
          <div style={{fontSize:11,color:"#64748b",marginBottom:6,fontWeight:600}}>DEADLINE</div>
          <input style={inp} type="date" value={newGoal.deadline} onChange={e=>setNewGoal(p=>({...p,deadline:e.target.value}))}/>
          <button style={{...btn,background:"linear-gradient(135deg,#a78bfa,#6366f1)"}} onClick={addGoal}>Create Goal</button>
          <button style={btnOut} onClick={()=>setShowGoalForm(false)}>Cancel</button>
        </div>
      </div>}

      {showBillForm&&<div style={modal} onClick={e=>e.target===e.currentTarget&&setShowBillForm(false)}>
        <div style={modalBox}>
          <div style={{fontSize:16,fontWeight:700,marginBottom:16,color:"#f1f5f9"}}>Add Bill Reminder</div>
          <div style={{marginBottom:10}}><div style={{fontSize:11,color:"#64748b",marginBottom:6,fontWeight:600}}>ICON</div><div style={{display:"flex",flexWrap:"wrap",gap:8}}>{BILL_ICONS.map(ic=><button key={ic} onClick={()=>setNewBill(p=>({...p,icon:ic}))} style={{width:36,height:36,borderRadius:10,border:`2px solid ${newBill.icon===ic?"#f97316":"#1e293b"}`,background:newBill.icon===ic?"#f9731622":"#0d1117",fontSize:18,cursor:"pointer"}}>{ic}</button>)}</div></div>
          <input style={inp} placeholder="Bill name" value={newBill.name} onChange={e=>setNewBill(p=>({...p,name:e.target.value}))}/>
          <input style={inp} placeholder="Amount ($)" type="number" value={newBill.amount} onChange={e=>setNewBill(p=>({...p,amount:e.target.value}))}/>
          <div style={{fontSize:11,color:"#64748b",marginBottom:6,fontWeight:600}}>DUE DATE</div>
          <input style={inp} type="date" value={newBill.due_date} onChange={e=>setNewBill(p=>({...p,due_date:e.target.value}))}/>
          <select style={inp} value={newBill.repeat} onChange={e=>setNewBill(p=>({...p,repeat:e.target.value}))}>{REPEAT_OPTIONS.map(r=><option key={r}>{r}</option>)}</select>
          <select style={inp} value={newBill.cat} onChange={e=>setNewBill(p=>({...p,cat:e.target.value}))}>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select>
          <button style={{...btn,background:"linear-gradient(135deg,#f97316,#ef4444)"}} onClick={addBill}>Add Bill</button>
          <button style={btnOut} onClick={()=>setShowBillForm(false)}>Cancel</button>
        </div>
      </div>}

      {showBudgetForm&&<div style={modal} onClick={e=>e.target===e.currentTarget&&setShowBudgetForm(false)}>
        <div style={{...modalBox,maxHeight:"80vh",overflowY:"auto"}}>
          <div style={{fontSize:16,fontWeight:700,marginBottom:4,color:"#f1f5f9"}}>Set Budget Limits</div>
          <div style={{fontSize:12,color:"#64748b",marginBottom:16}}>Monthly spending limits per category.</div>
          {CATEGORIES.map(c=>(
            <div key={c} style={{marginBottom:10}}><div style={{fontSize:11,color:"#94a3b8",marginBottom:4,fontWeight:600}}>{CAT_ICONS[c]} {c}</div><input style={inp} placeholder={`${c} limit ($)`} type="number" value={editBudget[c]||""} onChange={e=>setEditBudget(p=>({...p,[c]:e.target.value}))}/></div>
          ))}
          <button style={btn} onClick={saveBudgets}>Save Limits</button>
          <button style={btnOut} onClick={()=>setShowBudgetForm(false)}>Cancel</button>
        </div>
      </div>}

      {showAddSavings&&<div style={modal} onClick={e=>e.target===e.currentTarget&&setShowAddSavings(null)}>
        <div style={modalBox}>
          <div style={{fontSize:16,fontWeight:700,marginBottom:16,color:"#f1f5f9"}}>{goals.find(g=>g.id===showAddSavings)?.icon} Add to {goals.find(g=>g.id===showAddSavings)?.name}</div>
          <input style={inp} placeholder="Amount ($)" type="number" value={addAmt} onChange={e=>setAddAmt(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addToGoal(showAddSavings)}/>
          <button style={{...btn,background:"linear-gradient(135deg,#a78bfa,#6366f1)"}} onClick={()=>addToGoal(showAddSavings)}>Add Savings</button>
          <button style={btnOut} onClick={()=>setShowAddSavings(null)}>Cancel</button>
        </div>
      </div>}
    </div>
  );
}
