 dpd.users.get(this.userID, function (result) {
  this.user= result;
});


if(this.user !== null)
{
    emit('msgCreated', this);
   
}
else{
     cancel("User Does Not Exists", 401);
}

