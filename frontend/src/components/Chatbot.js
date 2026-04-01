
import React,{useState} from "react"

export default function Chatbot(){

const [msg,setMsg]=useState("")
const [reply,setReply]=useState("")

const ask=async()=>{

let res=await fetch(`${process.env.REACT_APP_API_URL}/ai/chat`,{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({message:msg})
})

let data=await res.json()
setReply(data.response)

}

return(
<div style={{position:"fixed",bottom:"20px",right:"20px",background:"white",padding:"10px"}}>

<input placeholder="Ask AI assistant" onChange={e=>setMsg(e.target.value)}/>
<button onClick={ask}>Ask</button>
<p>{reply}</p>

</div>
)
}
