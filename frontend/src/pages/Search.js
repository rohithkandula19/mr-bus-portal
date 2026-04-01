
import React,{useState} from "react"

export default function Search(){

const [origin,setOrigin]=useState("")
const [destination,setDestination]=useState("")
const [buses,setBuses]=useState([])

const search=async()=>{

let res=await fetch(`${process.env.REACT_APP_API_URL}/buses/search?origin=`+origin+"&destination="+destination)
let data=await res.json()
setBuses(data)

}

return(
<div>

<input placeholder="From city" onChange={e=>setOrigin(e.target.value)}/>
<input placeholder="To city" onChange={e=>setDestination(e.target.value)}/>

<button onClick={search}>Search</button>

{buses.map(b=>(
<div key={b.id}>
<h3>{b.bus}</h3>
<p>{b.origin} → {b.destination}</p>
<p>{b.departure}</p>
<p>${b.price}</p>
</div>
))}

</div>
)
}
