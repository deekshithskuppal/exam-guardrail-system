let warning = 0;

document.addEventListener("visibilitychange", function() {

if(document.hidden){
warning++;
alert("Warning: Tab switching detected!");

console.log("Tab switch count:", warning);

}

})
