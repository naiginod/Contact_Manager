function cl(arg) { console.log(arg) };

let App = {
  contacts: [],
  currentContact: {},
  renderContacts(data) {                       // renders contacts and binds events after render
    Handlebars.registerHelper('tagSplice', function(tagArr) {
      let tagStr = '';
      if (tagArr) {
        tagArr.forEach(function(tag) {
          tagStr += `<p class="tag" data-tag=${tag}>${tag}</p>`
        })
      }
      return tagStr;
    })
    Handlebars.registerPartial('contact_template', $('#contact_template').html());
    let contactTemplate = Handlebars.compile($('#contacts_template').html());
    $('#contacts').html(contactTemplate({contact: data}));
    if (!$('#contacts').html().trim()) {
      $('.noContacts').show();
    } else {
      this.contactEvents();
      $('.noContacts').hide();
    }
    $('.searchBar')[0].value = '';
    $('.main').hide().slideToggle(800);
    $('.tag').on('click', this.selectedTag.bind(this));
    $('.contactButton').on('mouseover mouseout', this.toggleButton);
    $('#allContacts').on('click', this.allContactButton.bind(this))
  },
  makeApiCall(method, url, func, data) {             // boilerplate api syntax
    let self = this;
    let request = new XMLHttpRequest();
    request.open(method, url);
    request.onreadystatechange = function() {
      if (request.readyState === 4 && request.status-200 < 5) {
        func(request, self)
      } else if (request.readyState === 4 && request.status-400 < 5) {
        cl(request.status)
        cl(request.responseText)
      }
    }
    request.send(data)
  },
  tagsToArray(str) {                                  // converts tags from string to array
    return str.split(',').map(function(el) { return el })
  },
  fetchContacts() {                                 // grabs contacts from server
    let self = this;
    this.makeApiCall('GET', 'http://localhost:4567/api/contacts', function(request, self) {
      self.contacts = JSON.parse(request.responseText);
      self.contacts.forEach(function (obj) {
        obj['contactText'] = `${obj['full_name']} 
        ${obj['email']} 
        ${obj['phone_number']}
        `
        if(obj['tags']) {
          obj['tags'] = self.tagsToArray(obj['tags'])
          obj['contactText'] += obj['tags']
        }
      })
      self.renderContacts(self.contacts);
    })
  },
  selectedTag(e) {                             // handles tags selection and re-rendering
    let selectedTag = e.target.innerText;
    let selectedContacts = this.contacts.filter(function(obj) {
      if (obj['tags'] && obj['tags'].includes(selectedTag)) { return obj; }
    });
    this.renderContacts(selectedContacts);
    $('#allContacts').show();
  },
  allContactButton(e) {                         // 'Show all contacts' button functionality
    e.stopImmediatePropagation();
    this.renderContacts(this.contacts);
    $('#allContacts').hide();
  },
  deleteContact(e) {                          // Deletes contact from server
    e.stopImmediatePropagation();
    if (confirm('Do you want to delete this contact?')) {
      let id = $($(e.target).closest('.contact')).attr('data-id')
      $(e.target).closest('.contact').remove();
      this.makeApiCall('DELETE', `http://localhost:4567/api/contacts/${id}`);
      this.contacts = this.contacts.filter(function (obj) {
        if (obj['id'] !== +id) {
          return obj;
        }
      })
      this.renderContacts(this.contacts);
      if (!$('#contacts').html().trim()) { $('.noContacts').show(); }        // if contacts empty show 'no contacts' msg
    }
  },
  editContactDisplay(e) {                   // edit contact display 
    e.stopImmediatePropagation();
    let id = $($(e.target).closest('.contact')).attr('data-id')
    this.currentContact = this.contacts.filter((obj) =>{
      if (obj['id'] === +id) { return obj; }
    })[0]
    $('.main').hide();
    this.slideUp($('.editContact'));

    ["full_name", "email", "phone_number", "tags"].forEach(function(el) {
      $(`.editContact #${el}`).val(this.currentContact[el]);
    }.bind(this));
  },
  addContactDisplay() {
    let self = this;                       // new contact display
    $('.addContact').on('click', function(e) {
      $('.main').hide();
      self.slideUp($('.createContact'));
      ["full_name", "email", "phone_number"].forEach((el) => { 
        $(`.createContact #${el}`).val('');
      });
    })
  },
  submitNewContact(e) {         // sends new contact to server
    let self = this;                     
    if ($(e.target).hasClass('submit')) {
      e.preventDefault();
      let form = document.querySelector('.contactForm')
      let data = new FormData(form);
      this.makeApiCall('POST', 'http://localhost:4567/api/contacts', function(request) {
        cl(request.responseText)
        self.fetchContacts();
        self.slideDown($('.createContact'));
      }, data)
    } else if ($(e.target).hasClass('cancel')) {
      this.mainDisplay($('.createContact'), e);
    }
  },
  submitUpdatedContact(e) {                  // sends editted contact to server
    let self = this;
    if ($(e.target).hasClass('submit')) {
      e.preventDefault();
      let id = this.currentContact['id']
      let json = JSON.stringify(this.currentContactToEdit());
      let request = new XMLHttpRequest();
      request.open('PUT', `http://localhost:4567/api/contacts/${id}`);
      request.setRequestHeader('Content-Type', 'application/json');
      request.onreadystatechange = function() {
        if (request.readyState === 4 && request.status-200 < 5) {
          let updatedInfo = JSON.parse(request.responseText);
          updatedInfo['id'] = id;
          self.contacts.map((obj) => { obj['id'] === updatedInfo['id'] ? updatedInfo : obj;})
        } else if (request.readyState === 4 && request.status-400 < 5) {
          cl(request.status)
          cl(request.responseText)
        }
      }
      request.send(json)
      this.currentContact = {};
      this.fetchContacts();
      this.slideDown($('.editContact'));
    } else if ($(e.target).hasClass('cancel')) {
      this.mainDisplay($('.editContact'), e);
    }
  },
  currentContactToEdit() {                            //returns the info to fill in edit contact display
    return {
      'full_name': $('.editContact #full_name').val(),
      'email': $('.editContact #email').val() ,
      'phone_number': $('.editContact #phone_number').val(),
      'tags': $('.editContact #tags').val(),
    }
  },
  mainDisplay(display, e) {                       // renders main display with all contacts
    e.preventDefault();
    this.slideDown(display);
    $('.allComponents').removeClass('spacer')
    this.renderContacts(this.contacts);
    $('.contactButton').off('mouseover mouseout').on('mouseover mouseout', function() {
      $(this).toggleClass('hover');
    })
  },
  contactEvents() {                               // handles delete/edit button events on each contact
    let self = this;
    $('#contacts').on('click', function(e) {
      if ($(e.target).hasClass('delete')){
        self.deleteContact(e);
      } else if ($(e.target).hasClass('edit')) {
        self.editContactDisplay(e);
      }
    })
  },
  toggleButton(e) {                             // toggles button css
    $(e.currentTarget).toggleClass('hover');
  },
  searchBarEvent(e) {                           // filters contacts for search bar criteria
    let self = this;
    let inputStr = $(e.target)[0].value.toLowerCase();
    let selectedContacts = this.contacts.filter (function (obj) { 
      if (obj['contactText'].toLowerCase().indexOf(inputStr) !== -1) { return obj; }
    });
    self.renderContacts(selectedContacts);
    $('#allContacts').show();
  },
  debounce(func, delay) {
    var timeout;

    return function() {
      var context = this;
      var args = arguments;
      if (timeout) {
        clearTimeout(timeout);
      }
      timeout = setTimeout(function() {
        func.apply(context, args);
      }, delay);
    };
  },
  slideUp(div) {
    $('.allComponents').addClass('spacer');
    div.css('display', 'block');
    div.animate({
      top: 0,
    }, 500)
  },
  slideDown(div) {
    $('.allComponents').removeClass('spacer');
    div.css('display', 'none');
    div.animate({
      top: '400px',
    }, 800)
  },
  bindEvents() {
    this.searchBarEvent = this.debounce(this.searchBarEvent.bind(this), 1000)
    $('.searchBar').on('keyup', this.searchBarEvent.bind(this))
    $('.new').on('click', this.submitNewContact.bind(this));
    $('.updated').on('click', this.submitUpdatedContact.bind(this));
  },
  init() {
    this.fetchContacts();
    this.addContactDisplay();
    this.bindEvents();
    $('button').on('mouseover mouseout', this.toggleButton);
  }
}

$(function() {
  App.init();
})
