// FMECA Application JavaScript
$(document).ready(function() {
  // Initialize tooltips
  var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
  var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl);
  });

  // Initialize popovers
  var popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
  var popoverList = popoverTriggerList.map(function (popoverTriggerEl) {
    return new bootstrap.Popover(popoverTriggerEl);
  });

  // CSRF Token setup for AJAX requests
  const csrfToken = $('meta[name="csrf-token"]').attr('content');
  if (csrfToken) {
    $.ajaxSetup({
      beforeSend: function(xhr) {
        xhr.setRequestHeader('X-CSRF-Token', csrfToken);
      }
    });
  }

  // Toast notification system
  window.showToast = function(message, type = 'info') {
    const toastContainer = $('.toast-container');
    if (toastContainer.length === 0) {
      $('body').append('<div class="toast-container"></div>');
    }

    const toastId = 'toast-' + Date.now();
    const toastHtml = `
      <div id="${toastId}" class="toast align-items-center text-white bg-${type} border-0" role="alert" aria-live="assertive" aria-atomic="true">
        <div class="d-flex">
          <div class="toast-body">
            ${message}
          </div>
          <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
      </div>
    `;

    $('.toast-container').append(toastHtml);
    const toast = new bootstrap.Toast(document.getElementById(toastId));
    toast.show();

    // Remove toast element after it's hidden
    $('#' + toastId).on('hidden.bs.toast', function() {
      $(this).remove();
    });
  };

  // Loading spinner
  window.showSpinner = function() {
    if ($('.spinner-overlay').length === 0) {
      $('body').append(`
        <div class="spinner-overlay">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
        </div>
      `);
    }
  };

  window.hideSpinner = function() {
    $('.spinner-overlay').remove();
  };

  // Sidebar toggle for mobile
  $('.sidebar-toggle').on('click', function() {
    $('.sidebar').toggleClass('show');
  });

  // Close sidebar when clicking outside on mobile
  $(document).on('click', function(e) {
    if ($(window).width() <= 768) {
      if (!$(e.target).closest('.sidebar, .sidebar-toggle').length) {
        $('.sidebar').removeClass('show');
      }
    }
  });

  // Auto-hide alerts after 5 seconds
  $('.alert:not(.alert-permanent)').delay(5000).fadeOut();

  // Confirm delete actions
  $('.btn-delete').on('click', function(e) {
    if (!confirm('Are you sure you want to delete this item? This action cannot be undone.')) {
      e.preventDefault();
      return false;
    }
  });

  // Form validation enhancement
  $('form[data-validate="true"]').on('submit', function(e) {
    const form = this;
    if (!form.checkValidity()) {
      e.preventDefault();
      e.stopPropagation();
    }
    $(form).addClass('was-validated');
  });

  // Auto-save functionality for forms
  $('form[data-autosave="true"]').on('input change', debounce(function() {
    const form = $(this);
    const formData = form.serialize();
    
    $.ajax({
      url: form.attr('action') || window.location.pathname,
      method: 'PATCH',
      data: formData,
      success: function() {
        showToast('Changes saved automatically', 'success');
      },
      error: function() {
        showToast('Failed to save changes', 'danger');
      }
    });
  }, 2000));

  // Debounce function
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // Table utilities
  window.initDataTable = function(selector, options = {}) {
    const defaultOptions = {
      responsive: true,
      pageLength: 25,
      lengthMenu: [[10, 25, 50, 100], [10, 25, 50, 100]],
      order: [[0, 'desc']],
      language: {
        search: "Search:",
        lengthMenu: "Show _MENU_ entries",
        info: "Showing _START_ to _END_ of _TOTAL_ entries",
        paginate: {
          first: "First",
          last: "Last",
          next: "Next",
          previous: "Previous"
        }
      }
    };

    return $(selector).DataTable($.extend(defaultOptions, options));
  };

  // FMECA specific functions
  window.calculateRPN = function(severity, occurrence, detectability) {
    return severity * occurrence * detectability;
  };

  window.getCriticalityClass = function(rpn) {
    if (rpn >= 200) return 'high';
    if (rpn >= 100) return 'medium';
    return 'low';
  };

  window.updateRPNCell = function(row, severity, occurrence, detectability) {
    const rpn = calculateRPN(severity, occurrence, detectability);
    const criticality = getCriticalityClass(rpn);
    
    const rpnCell = $(row).find('.rpn-cell');
    rpnCell.text(rpn);
    rpnCell.removeClass('text-criticality-low text-criticality-medium text-criticality-high');
    rpnCell.addClass('text-criticality-' + criticality);
    
    const criticalityBadge = $(row).find('.criticality-badge');
    criticalityBadge.removeClass('badge-criticality-low badge-criticality-medium badge-criticality-high');
    criticalityBadge.addClass('badge-criticality-' + criticality);
    criticalityBadge.text(criticality);
  };

  // Inline editing for FMECA tables
  $('.fmeca-table .editable-cell').on('click', function() {
    const cell = $(this);
    const currentValue = cell.text().trim();
    const field = cell.data('field');
    const min = cell.data('min') || 1;
    const max = cell.data('max') || 10;
    
    if (cell.find('input').length > 0) return; // Already editing
    
    const input = $(`<input type="number" class="form-control form-control-sm" min="${min}" max="${max}" value="${currentValue}">`);
    cell.html(input);
    input.focus().select();
    
    input.on('blur keypress', function(e) {
      if (e.type === 'keypress' && e.which !== 13) return;
      
      const newValue = parseInt($(this).val()) || currentValue;
      cell.text(newValue);
      
      // Update RPN if this is a rating field
      if (['severity', 'occurrence', 'detectability'].includes(field)) {
        const row = cell.closest('tr');
        const severity = parseInt(row.find('[data-field="severity"]').text()) || 1;
        const occurrence = parseInt(row.find('[data-field="occurrence"]').text()) || 1;
        const detectability = parseInt(row.find('[data-field="detectability"]').text()) || 1;
        
        updateRPNCell(row, severity, occurrence, detectability);
        
        // Save to server
        const itemId = row.data('item-id');
        if (itemId) {
          $.ajax({
            url: `/api/fmeca/items/${itemId}`,
            method: 'PATCH',
            data: {
              [field]: newValue,
              severity: severity,
              occurrence: occurrence,
              detectability: detectability
            },
            success: function() {
              showToast('FMECA item updated', 'success');
            },
            error: function() {
              showToast('Failed to update FMECA item', 'danger');
            }
          });
        }
      }
    });
  });

  // File upload handling
  $('.file-upload-area').on('dragover dragenter', function(e) {
    e.preventDefault();
    e.stopPropagation();
    $(this).addClass('dragover');
  });

  $('.file-upload-area').on('dragleave dragend', function(e) {
    e.preventDefault();
    e.stopPropagation();
    $(this).removeClass('dragover');
  });

  $('.file-upload-area').on('drop', function(e) {
    e.preventDefault();
    e.stopPropagation();
    $(this).removeClass('dragover');
    
    const files = e.originalEvent.dataTransfer.files;
    handleFileUpload(files, $(this));
  });

  function handleFileUpload(files, uploadArea) {
    const formData = new FormData();
    const entityType = uploadArea.data('entity-type');
    const entityId = uploadArea.data('entity-id');
    
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }
    
    formData.append('entity_type', entityType);
    formData.append('entity_id', entityId);
    
    showSpinner();
    
    $.ajax({
      url: '/api/upload',
      method: 'POST',
      data: formData,
      processData: false,
      contentType: false,
      success: function(response) {
        hideSpinner();
        showToast('Files uploaded successfully', 'success');
        // Refresh attachments list if exists
        if (typeof refreshAttachments === 'function') {
          refreshAttachments();
        }
      },
      error: function() {
        hideSpinner();
        showToast('Failed to upload files', 'danger');
      }
    });
  }

  // Search functionality
  $('#global-search').on('input', debounce(function() {
    const query = $(this).val().trim();
    if (query.length >= 3) {
      performSearch(query);
    }
  }, 500));

  function performSearch(query) {
    $.ajax({
      url: '/api/search',
      method: 'GET',
      data: { q: query },
      success: function(results) {
        displaySearchResults(results);
      },
      error: function() {
        showToast('Search failed', 'danger');
      }
    });
  }

  function displaySearchResults(results) {
    // Implementation depends on UI design
    console.log('Search results:', results);
  }

  // Initialize any existing data tables
  if ($('.data-table').length > 0) {
    $('.data-table').each(function() {
      initDataTable(this);
    });
  }

  // Prevent sidebar hover expansion while interacting with asset tree or clicking outside sidebar
  function addSidebarShield() {
    if ($('#sidebar-hover-shield').length === 0) {
      $('body').append('<div id="sidebar-hover-shield" style="position:fixed;left:0;top:var(--navbar-height);height:calc(100vh - var(--navbar-height));width:64px;z-index:1049;pointer-events:auto;background:transparent;"></div>');
    }
    $('body').addClass('sidebar-hover-block');
  }
  function removeSidebarShield() {
    $('#sidebar-hover-shield').remove();
    $('body').removeClass('sidebar-hover-block');
  }

  $(document).on('mouseenter', '.asset-tree, .asset-tree *', function() {
    addSidebarShield();
  });
  $(document).on('mouseleave', '.asset-tree, .asset-tree *', function() {
    removeSidebarShield();
  });

  // Guard during any click outside the sidebar (prevents transient hover on sidebar)
  $(document).on('mousedown', function(e) {
    if (!$(e.target).closest('.sidebar').length) {
      addSidebarShield();
    }
  });
  $(document).on('mouseup', function(e) {
    // Small delay helps cover SPA navigation/re-render
    setTimeout(removeSidebarShield, 250);
  });

  console.log('FMECA Application initialized');
});