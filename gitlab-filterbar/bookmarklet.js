
function start() {
  var extensFilter = null;

  let allUsers = [];

  let allLables = [];
  let filterWithOr = false;

  let anyUser = true;
  let selectedUsers = {};

  let anyLabel = false;
  let selectedLables = {};

  // TODO check if we are in the gitlab board
  extensionFilter = $('div.extension-filter');
  if (extensionFilter.length == 0) {
    // add needed function
    $.expr[':'].trimmedTextEquals = $.expr.createPseudo(function(arg) {
        return function( elem ) {
            return $(elem).text().trim().match("^" + arg + "$");
        };
    });

    $('div.layout-page').append(`<div class="extension-filter" style="position: fixed; top: 40px; right: 00px; width: 220px; background-color: #fafafa; height: 100%; z-index: 1000; margin-bottom: 0px;">`)
    $('div.content-wrapper').css('width', 'calc(100% - 220px)')
    // add some helper classes
    $(`<style type='text/css'>
          .nsl-extension-filter-hidden{ color:#f00 !important; font-weight:bold;}
          button.nsl-extension-filter-selected{ color:#f00 !important; font-weight:bold;}
          .nsl-ext-right-sidebar{ right: 220px !important }
          .nsl-ext-nonmatcher { display: none !important }
      </style>`).appendTo("head");

      $('.right-sidebar').addClass('nsl-ext-right-sidebar')
    extensionFilter = $('div.extension-filter');

    MutationObserver = window.MutationObserver || window.WebKitMutationObserver;


console.log('setting up observer??')
    for (let el of $('.loading-container:parent(.board-list-count)')) {
      console.log('setting up observer for')
      console.log(el);
      let observer = new MutationObserver(function(mutations, observer) {
          console.log("Mutations");
          console.log(mutations);
          markNonMatchers()
      });
      // define what element should be observed by the observer
      // and what types of mutations trigger the callback
      observer.observe(el, { attributes: true, childList: true, characterData: true });
    }


  } else {
    // bookmarklet was executed before... toggle filter menu
    if ($(extensionFilter[0]).is(':visible')) {
      extensionFilter.hide();
      $('div.content-wrapper').css('width', '100%')
      $('.right-sidebar').removeClass('nsl-ext-right-sidebar')
    } else {
      extensionFilter.show();
      $('div.content-wrapper').css('width', 'calc(100% - 220px)')
      $('.right-sidebar').addClass('nsl-ext-right-sidebar')
    }
    return
  }


  $.get( "labels.json?include_ancestor_groups=true&include_descendant_groups=true", function( data ) {
    allLables = data;
    extensionFilter.empty();
    let labelsHTML = renderLabels(allLables, selectedLables)
    let usersHTML = renderUsers(allUsers, selectedUsers)
    let settings = renderSettings(filterWithOr);
    extensionFilter.append(labelsHTML + usersHTML +settings);
  });


  $.get( "/api/v4/users.json?search=&per_page=100", function( data ) {
    allUsers = data;
    extensionFilter.empty();
    let labelsHTML = renderLabels(allLables, selectedLables)
    let usersHTML = renderUsers(allUsers, selectedUsers)
    let settings = renderSettings(filterWithOr);
    extensionFilter.append(labelsHTML + usersHTML +settings);
  });

  let labelsHTML = renderLabels(allLables, selectedLables)
  let usersHTML = renderUsers(allUsers, selectedUsers)
  let settings = renderSettings(filterWithOr);
  extensionFilter.append(labelsHTML + usersHTML +settings);

  extensionFilter.on('click', function(el) {

    let clickTarget = el.target;

    let button = $(clickTarget).parents("button")

    let targetType = clickTarget.getAttribute('nsl-ext-type');
    if (!targetType) {
      let buttons = $(clickTarget).parents("button");
      if (buttons.length == 0) {
        return;
      }
      targetType = buttons[0].getAttribute('nsl-ext-type');
      clickTarget = buttons[0];
      if (!targetType) {
        return;
      }
    }

    if (targetType == 'user') {
      let id = clickTarget.getAttribute('nsl-ext-id');
      if (selectedUsers[id]) {
        delete selectedUsers[id];
        console.log('delete user selection for id' + id);
      } else {
        selectedUsers[id] = allUsers.find( user => user.id == id );
        console.log('add user selection for id' + id);
      }

    } else if (targetType == 'user-any') {
      console.log('ressetting users and set to any');
      selectedUsers = {};
      anyUser = true;
    } else if (targetType == 'user-none') {
      console.log('ressetting users and set to none');
      selectedUsers = {};
      anyUser = false;

    }

    if (targetType == 'label') {
      let id = clickTarget.getAttribute('nsl-ext-id');
      if (selectedLables[id]) {
        console.log('delete label selection for id' + id);
        delete selectedLables[id];
      } else {
        console.log('find label selection for id' + id);
        selectedLables[id] = allLables.find( label => label.id == id );
      }
    } else if (targetType == 'label-any') {
      console.log('ressetting label and set to any');
      anyLabel = true;
      selectedLables = {};
    } else if (targetType == 'label-none') {
      console.log('ressetting label and set to none');
      anyLabel = false;
      selectedLables = {};
    }

    if(!targetType) debugger;
    console.log('what happend?' + targetType);

    applyLableSelectionState(selectedLables, anyLabel);
    applyUserSelectionState(selectedUsers, anyUser);
    markNonMatchers()
  });

  function markNonMatchers() {
    // cleanup -> show all
    $('li.nsl-ext-nonmatcher').removeClass('nsl-ext-nonmatcher');

    if (Object.keys(selectedLables).length > 0) {

      if (filterWithOr) {
        //li.board-card:not(:has(button:trimmedTextEquals("Open questions"), button:trimmedTextEquals("Feature Proposal")))
        let cssPathExpression = 'li.board-card:not(:has(' +  Object.values(selectedLables).map(label => `button:trimmedTextEquals("${label.title}")` ).join(', ') + '))';
        console.log('any lable expression ' +cssPathExpression);
        $(cssPathExpression).addClass('nsl-ext-nonmatcher')
      } else {
        // li.board-card:not(:has(button:trimmedTextEquals("electron-skeleton")):has(button:trimmedTextEquals("Feature Proposal")))
        let cssPathExpression = 'li.board-card:not(' +  Object.values(selectedLables).map(label => `:has(button:trimmedTextEquals("${label.title}"))` ).join('') + ')';
        console.log('any lable expression ' +cssPathExpression);
        $(cssPathExpression).addClass('nsl-ext-nonmatcher')
      }
    } else if (!anyLabel) {
      // mark cards with no label
      let cssPathExpression = 'li.board-card:has(div.board-card-labels)';
      $(cssPathExpression).addClass('nsl-ext-nonmatcher')
    } else {
      // nothing to hide for applyLableSelectionState
    }

    if (Object.keys(selectedUsers).length > 0) {
      // li.board-card:not(:has(div:has(a[href="/mspaeth"], a[href="/dahlem"])))
      let cssPathExpression = 'li.board-card:not(:has(div:has(' + Object.values(selectedUsers).map(user => `a[href="/${user.username}"]` ).join(', ') + ')))';
      console.log('any selectedLabels expression ' + cssPathExpression);
      $(cssPathExpression).addClass('nsl-ext-nonmatcher')
    } else if (!anyUser) {
      // mark cards with no label
      // board-card-assignee
      let cssPathExpression = 'li.board-card:has(a.user-avatar-link)';
      $(cssPathExpression).addClass('nsl-ext-nonmatcher')
    } else {
      // nothing to hide for applyLableSelectionState
    }

    for (let list of $('.js-board-list')) {
      // trigger the load
      list.dispatchEvent(new Event('scroll'))
    }
  }

  function applyLableSelectionState(selectedLabels, anyLable) {
     let foundSelectedLables = false;
     // lets reset all labels
     $('button[nsl-ext-type*=label]').removeClass("nsl-extension-filter-selected");

     for (lableId of Object.keys(selectedLabels)) {
       foundSelectedLables = true;
       $(`button[nsl-ext-type=label][nsl-ext-id=${lableId}]`).addClass("nsl-extension-filter-selected");
     }

     if(!foundSelectedLables) {
       if (anyLable) {
         $(`button[nsl-ext-type=label-any]`).addClass("nsl-extension-filter-selected");
         $(`button[nsl-ext-type=label-none]`).removeClass("nsl-extension-filter-selected");
       } else {
           $(`button[nsl-ext-type=label-any]`).removeClass("nsl-extension-filter-selected");
           $(`button[nsl-ext-type=label-none]`).addClass("nsl-extension-filter-selected");
       }
     }
  }



  function applyUserSelectionState(selecteUsers, anyUser) {
     let foundSelectedUsers = false;
     // lets reset all labels
     $('button[nsl-ext-type*=user]').removeClass("nsl-extension-filter-selected");

     for (userId of Object.keys(selecteUsers)) {
       foundSelectedUsers = true;
       $(`button[nsl-ext-type=user][nsl-ext-id=${userId}]`).addClass("nsl-extension-filter-selected");
     }

     if(!foundSelectedUsers) {
       if (anyUser) {
         $(`button[nsl-ext-type=user-any]`).addClass("nsl-extension-filter-selected");
         $(`button[nsl-ext-type=user-none]`).removeClass("nsl-extension-filter-selected");
       } else {
           $(`button[nsl-ext-type=user-any]`).removeClass("nsl-extension-filter-selected");
           $(`button[nsl-ext-type=user-none]`).addClass("nsl-extension-filter-selected");
       }
     }
  }

  function renderLabels(labels, selectedLabels) {

    let renderedLabels = '';
    for (let label of labels) {
      renderedLabels += renderLabel(label, selectedLabels[label.id])
    }

    return `
    <div class="filtered-search-input-dropdown-menu dropdown-menu nsl-ext-user-filter" id="js-dropdown-label" data-dropdown-active="true" style="max-width: unset;max-height: unset;height: 50%;width: 100%;display: block;position: initial; ; margin-bottom: 0px;">
      <ul data-dropdown="">
      <li class="divider droplab-item-ignore"></li>
        <li class="filter-dropdown-item" data-value="None">
          <button class="btn btn-link" type="button" nsl-ext-type="label-none">
            None
          </button>
        </li>
        <li class="filter-dropdown-item" data-value="Any">
          <button class="btn btn-link" type="button" nsl-ext-type="label-any">
            Any
          </button>
        </li>
        <li class="divider droplab-item-ignore"></li>
      </ul>
      <ul class="filter-dropdown" data-dropdown="" data-dynamic="">
        ${renderedLabels}
      </ul>
    </div>
    `
  }

  function renderLabel(label, selected) {
    return `<li class="filter-dropdown-item" style="display: block;">
      <button class="btn btn-link ${selected ? "nsl-extension-filter-selected" : ""}" type="button" nsl-ext-type="label" nsl-ext-id="${label.id}">
        <span class="dropdown-label-box" style="background: ${label.color}"></span>
        <span class="label-title js-data-value">
          ${label.title}
        </span>
      </button>
    </li>`
  }

  function renderUsers(users, selectedUsers) {

    let renderedUsers = '';
    for (let user of users) {
      renderedUsers += renderUser(user, selectedUsers[user.id])
    }

    return `<div class="filtered-search-input-dropdown-menu dropdown-menu nsl-ext-lable-filter" id="js-dropdown-author" data-dropdown-active="true" style="max-width: unset;max-height: unset;height: calc(50% - 160px);width: 100%;display: block;position: initial; margin-top: 0px; margin-bottom: 0px;   border-radius: 0px;">
    <ul data-dropdown="">
      <li class="filter-dropdown-item" data-value="None" >
        <button class="btn btn-link" type="button" nsl-ext-type="user-none">
          None
        </button>
      </li>
      <li class="filter-dropdown-item" data-value="Any" >
        <button class="btn btn-link" type="button" nsl-ext-type="user-any" >
          Any
        </button>
      </li>
      <li class="divider droplab-item-ignore"></li>
    </ul>
      <ul class="filter-dropdown" data-dropdown="" data-dynamic="">

      ${renderedUsers}

      </ul>
    </div>`
  }

  function renderUser(user, selected) {
    return `<li class="filter-dropdown-item" style="display: block;">
      <button class="btn btn-link dropdown-user ${selected ? "nsl-extension-filter-selected" : ""}" type="button" nsl-ext-type="user" nsl-ext-id="${user.id}">
        <div class="avatar-container s40">
          <img alt="${user.name}'s avatar" src="${user.avatar_url}" class="avatar s40 lazy" title="${user.name}"></div>
          <div class="dropdown-user-details">
            <span>
              ${user.name}
            </span>
            <span class="dropdown-light-content">
              @${user.username}
            </span>
          </div>
        </button>
      </li>`
  }

  function renderSettings(matchAll) {
    return `<div class="filtered-search-input-dropdown-menu dropdown-menu nsl-ext-user-filter" id="js-dropdown-label" data-dropdown-active="true" style="max-width: unset;max-height: unset;height: 50%;width: 100%;display: block;position: initial; ; margin-bottom: 0px;">
      <ul data-dropdown="">
      <li class="filter-dropdown-item" data-value="None">
        <button class="btn btn-link ${!matchAll ? "nsl-extension-filter-selected" : ""}" type="button" nsl-ext-type="match-any">
          Matches any
        </button>
      </li>
      <li class="filter-dropdown-item" data-value="None">
        <button class="btn btn-link ${matchAll ? "nsl-extension-filter-selected" : ""}" type="button" nsl-ext-type="match-all">
          Matches all
        </button>
      </li>
      <li class="filter-dropdown-item" data-value="None">
        <button class="btn btn-link " type="button" nsl-ext-type="collapse">
         Collapps >>
        </button>
      </li>
    </div> `;
  }



}
