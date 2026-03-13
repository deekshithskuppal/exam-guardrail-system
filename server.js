const express = require('express');
const app = express();

app.use(express.json());

app.get("/", (req,res)=>{
res.send("Exam Guardrail Server Running");
});

app.post("/report", (req,res)=>{

let data = req.body;

console.log("Student Report:",data);

res.send("Report Saved");

});

app.listen(3000, ()=>{
console.log("Server running on port 3000");
});
