function NewContact(obj) {
  this.full_name = obj['full_name'];
  this.email = obj['email'];
  this.phone_number = obj['phone_number'];
  this.tags = obj['tags'];
}

NewContact.prototype.editButton = function() {
  
}