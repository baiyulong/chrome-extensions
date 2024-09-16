let currentFolder = null;
let folderHistory = [];
let forwardHistory = [];

document.addEventListener('DOMContentLoaded', function() {
  const backBtn = document.getElementById('back-btn');
  const forwardBtn = document.getElementById('forward-btn');
  const upBtn = document.getElementById('up-btn');
  const searchInput = document.getElementById('search-input');
  const pathBar = document.getElementById('path-bar');
  const bookmarkGrid = document.getElementById('bookmark-grid');

  // Create context menu
  const contextMenu = document.createElement('div');
  contextMenu.id = 'context-menu';
  document.body.appendChild(contextMenu);

  backBtn.addEventListener('click', navigateBack);
  forwardBtn.addEventListener('click', navigateForward);
  upBtn.addEventListener('click', navigateUp);
  searchInput.addEventListener('input', searchBookmarks);

  // Add event listeners to hide context menu
  document.addEventListener('click', hideContextMenu);
  document.addEventListener('contextmenu', hideContextMenu);

  // Add event listener for right-click on empty area
  bookmarkGrid.addEventListener('contextmenu', showEmptyAreaContextMenu);

  loadBookmarks();

  function showEmptyAreaContextMenu(e) {
    if (e.target !== bookmarkGrid) return;

    e.preventDefault();
    hideContextMenu();
    
    contextMenu.innerHTML = `
      <div class="context-menu-item" data-action="new-folder">New Folder</div>
      <div class="context-menu-separator"></div>
      <div class="context-menu-item" data-action="view-large-icons">Large Icons</div>
      <div class="context-menu-item" data-action="view-medium-icons">Medium Icons</div>
      <div class="context-menu-item" data-action="view-small-icons">Small Icons</div>
      <div class="context-menu-item" data-action="view-list">List</div>
      <div class="context-menu-separator"></div>
      <div class="context-menu-item" data-action="themes">Themes</div>
    `;
    contextMenu.style.display = 'block';
    contextMenu.style.left = `${e.pageX}px`;
    contextMenu.style.top = `${e.pageY}px`;

    contextMenu.addEventListener('click', handleEmptyAreaContextMenuAction);
    
    e.stopPropagation();
  }

  function handleEmptyAreaContextMenuAction(event) {
    const action = event.target.dataset.action;
    switch (action) {
      case 'new-folder':
        createNewFolder(currentFolder.id);
        break;
      case 'view-large-icons':
      case 'view-medium-icons':
      case 'view-small-icons':
      case 'view-list':
        changeViewMode(action);
        break;
      case 'themes':
        showThemeMenu(event);
        break;
    }
    hideContextMenu();
  }

  function showThemeMenu(event) {
    const themeMenu = document.createElement('div');
    themeMenu.id = 'theme-menu';
    themeMenu.innerHTML = `
      <div class="theme-item" data-theme="windows">Windows Style</div>
      <div class="theme-item" data-theme="macos">macOS Style</div>
    `;
    document.body.appendChild(themeMenu);

    const rect = event.target.getBoundingClientRect();
    themeMenu.style.display = 'block';
    themeMenu.style.left = `${rect.right}px`;
    themeMenu.style.top = `${rect.top}px`;

    themeMenu.addEventListener('click', handleThemeSelection);
  }

  function handleThemeSelection(event) {
    const theme = event.target.dataset.theme;
    if (theme) {
      applyTheme(theme);
      localStorage.setItem('selectedTheme', theme);
      // Refresh the current folder to update icons
      loadBookmarks(currentFolder.id);
    }
    document.body.removeChild(document.getElementById('theme-menu'));
  }

  function applyTheme(theme) {
    document.body.className = `theme-${theme}`;
  }

  function changeViewMode(mode) {
    bookmarkGrid.className = mode;
    // You can add more logic here to change the layout based on the selected mode
  }

  function showContextMenu(e, item) {
    e.preventDefault();
    hideContextMenu();
    
    contextMenu.innerHTML = `
      <div class="context-menu-item" data-action="open">${item.url ? 'Open' : 'Open Folder'}</div>
      <div class="context-menu-separator"></div>
      <div class="context-menu-item" data-action="edit">Edit</div>
      <div class="context-menu-item" data-action="delete">Delete</div>
      ${!item.url ? '<div class="context-menu-separator"></div>' : ''}
      ${!item.url ? '<div class="context-menu-item" data-action="new-bookmark">New Bookmark</div>' : ''}
    `;
    contextMenu.style.display = 'block';
    contextMenu.style.left = `${e.pageX}px`;
    contextMenu.style.top = `${e.pageY}px`;

    contextMenu.addEventListener('click', (event) => handleContextMenuAction(event, item));
    
    e.stopPropagation();
  }

  function hideContextMenu() {
    contextMenu.style.display = 'none';
  }

  function handleContextMenuAction(event, item) {
    const action = event.target.dataset.action;
    switch (action) {
      case 'open':
        if (item.url) {
          chrome.tabs.create({ url: item.url });
        } else {
          navigateTo(item.id);
        }
        break;
      case 'edit':
        editBookmark(item);
        break;
      case 'delete':
        deleteBookmark(item);
        break;
      case 'new-bookmark':
        createNewBookmark(item.id);
        break;
    }
    hideContextMenu();
  }

  function editBookmark(item) {
    const newTitle = prompt('Enter new title:', item.title);
    const newUrl = item.url ? prompt('Enter new URL:', item.url) : null;
    if (newTitle !== null) {
      chrome.bookmarks.update(item.id, { title: newTitle, url: newUrl }, () => {
        loadBookmarks(currentFolder.id);
      });
    }
  }

  function deleteBookmark(item) {
    if (confirm(`Are you sure you want to delete "${item.title}"?`)) {
      chrome.bookmarks.remove(item.id, () => {
        loadBookmarks(currentFolder.id);
      });
    }
  }

  function createNewBookmark(parentId) {
    const title = prompt('Enter bookmark title:');
    const url = prompt('Enter bookmark URL:');
    if (title && url) {
      chrome.bookmarks.create({ parentId, title, url }, () => {
        loadBookmarks(currentFolder.id);
      });
    }
  }

  function createNewFolder(parentId) {
    const title = prompt('Enter folder name:');
    if (title) {
      chrome.bookmarks.create({ parentId, title }, () => {
        loadBookmarks(currentFolder.id);
      });
    }
  }

  function updatePathBar() {
    pathBar.innerHTML = '';
    let path = [];
    let currentNode = currentFolder;

    while (currentNode) {
      path.unshift(currentNode);
      currentNode = currentNode.parentId ? { id: currentNode.parentId } : null;
    }

    path.forEach((node, index) => {
      const segment = document.createElement('span');
      segment.className = 'path-segment';
      segment.textContent = node.title || 'Bookmarks';
      segment.addEventListener('click', () => navigateTo(node.id));
      pathBar.appendChild(segment);

      if (index < path.length - 1) {
        const separator = document.createElement('span');
        separator.className = 'path-separator';
        separator.textContent = '>';
        pathBar.appendChild(separator);
      }
    });
  }

  function navigateTo(folderId) {
    folderHistory.push(currentFolder.id);
    forwardHistory = [];
    loadBookmarks(folderId);
  }

  function navigateBack() {
    if (folderHistory.length > 0) {
      forwardHistory.push(currentFolder.id);
      const previousFolderId = folderHistory.pop();
      loadBookmarks(previousFolderId);
    }
  }

  function navigateForward() {
    if (forwardHistory.length > 0) {
      folderHistory.push(currentFolder.id);
      const nextFolderId = forwardHistory.pop();
      loadBookmarks(nextFolderId);
    }
  }

  function navigateUp() {
    if (currentFolder.parentId) {
      navigateTo(currentFolder.parentId);
    }
  }

  function truncateTitle(title, maxLength = 30) {
    return title.length > maxLength ? title.substring(0, maxLength - 3) + '...' : title;
  }

  function searchBookmarks() {
    const query = searchInput.value.toLowerCase();
    chrome.bookmarks.search(query, function(results) {
      bookmarkGrid.innerHTML = '';
      results.forEach(bookmark => {
        const item = document.createElement('div');
        item.className = `bookmark-item ${bookmark.url ? 'bookmark' : 'folder'}`;
        item.draggable = true;
        item.dataset.id = bookmark.id;
        item.innerHTML = `
          <div class="icon"></div>
          <div class="title">${bookmark.title}</div>
        `;
        item.addEventListener('click', () => {
          if (bookmark.url) {
            chrome.tabs.create({ url: bookmark.url });
          } else {
            folderHistory.push(currentFolder.id);
            loadBookmarks(bookmark.id);
          }
        });
        item.addEventListener('contextmenu', (e) => showContextMenu(e, bookmark));
        item.addEventListener('dragstart', handleDragStart);
        item.addEventListener('dragover', handleDragOver);
        item.addEventListener('dragenter', handleDragEnter);
        item.addEventListener('dragleave', handleDragLeave);
        item.addEventListener('drop', handleDrop);
        item.addEventListener('dragend', handleDragEnd);
        bookmarkGrid.appendChild(item);
      });
    });
  }

  function displayBookmarks(folder) {
    bookmarkGrid.innerHTML = '';
    folder.children.forEach(child => {
      const item = document.createElement('div');
      item.className = `bookmark-item ${child.url ? 'bookmark' : 'folder'}`;
      item.draggable = true;
      item.dataset.id = child.id;
      item.innerHTML = `
        <div class="icon"></div>
        <div class="title" title="${child.title}">${truncateTitle(child.title)}</div>
      `;
      item.addEventListener('click', () => {
        if (child.url) {
          chrome.tabs.create({ url: child.url });
        } else {
          navigateTo(child.id);
        }
      });
      item.addEventListener('contextmenu', (e) => showContextMenu(e, child));
      item.addEventListener('dragstart', handleDragStart);
      item.addEventListener('dragover', handleDragOver);
      item.addEventListener('dragenter', handleDragEnter);
      item.addEventListener('dragleave', handleDragLeave);
      item.addEventListener('drop', handleDrop);
      item.addEventListener('dragend', handleDragEnd);
      bookmarkGrid.appendChild(item);
    });
  }

  function handleDragStart(e) {
    e.dataTransfer.setData('text/plain', e.target.dataset.id);
    e.target.classList.add('dragging');
  }

  function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }

  function handleDragEnter(e) {
    e.preventDefault();
    e.target.closest('.bookmark-item').classList.add('drag-over');
  }

  function handleDragLeave(e) {
    e.target.closest('.bookmark-item').classList.remove('drag-over');
  }

  function handleDrop(e) {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData('text');
    const targetId = e.target.closest('.bookmark-item').dataset.id;
    
    if (draggedId !== targetId) {
      const draggedElement = document.querySelector(`.bookmark-item[data-id="${draggedId}"]`);
      const targetElement = e.target.closest('.bookmark-item');
      
      const rect = targetElement.getBoundingClientRect();
      const dropPosition = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
      
      if (dropPosition === 'before') {
        bookmarkGrid.insertBefore(draggedElement, targetElement);
      } else {
        bookmarkGrid.insertBefore(draggedElement, targetElement.nextSibling);
      }
      
      updateBookmarkOrder();
    }
    
    e.target.closest('.bookmark-item').classList.remove('drag-over');
  }

  function handleDragEnd(e) {
    e.target.classList.remove('dragging');
    document.querySelectorAll('.bookmark-item').forEach(item => {
      item.classList.remove('drag-over');
    });
  }

  function updateBookmarkOrder() {
    const bookmarkItems = Array.from(bookmarkGrid.children);
    const updates = bookmarkItems.map((item, index) => {
      return new Promise((resolve) => {
        chrome.bookmarks.move(item.dataset.id, { index: index }, resolve);
      });
    });
    
    Promise.all(updates).then(() => {
      loadBookmarks(currentFolder.id);
    });
  }

  function loadBookmarks(folderId = '1') {
    chrome.bookmarks.getSubTree(folderId, function(results) {
      currentFolder = results[0];
      displayBookmarks(currentFolder);
      updatePathBar();
    });
  }

  // Load saved theme
  const savedTheme = localStorage.getItem('selectedTheme') || 'windows';
  applyTheme(savedTheme);

  document.body.className = `theme-${savedTheme}`;
});