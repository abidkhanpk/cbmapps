// Global CSRF token setup
const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');

// Setup AJAX with CSRF token
$.ajaxSetup({
  beforeSend: function(xhr) {
    if (csrfToken) {
      xhr.setRequestHeader('X-CSRF-Token', csrfToken);
    }
  }
});

// Toast notification helper
function showToast(message, type = 'info') {
  const toast = $('#toast');
  const toastBody = toast.find('.toast-body');
  
  // Set message and styling
  toastBody.text(message);
  toast.removeClass('bg-success bg-danger bg-warning bg-info')
       .addClass(`bg-${type} text-white`);
  
  // Show toast
  const bsToast = new bootstrap.Toast(toast[0]);
  bsToast.show();
}

// Form validation helper
function validateForm(form) {
  const inputs = form.find('input[required], select[required], textarea[required]');
  let isValid = true;
  
  inputs.each(function() {
    const input = $(this);
    if (!input.val().trim()) {
      input.addClass('is-invalid');
      isValid = false;
    } else {
      input.removeClass('is-invalid');
    }
  });
  
  return isValid;
}

// Generic AJAX form handler
function handleAjaxForm(form, successCallback) {
  form.on('submit', function(e) {
    e.preventDefault();
    
    if (!validateForm(form)) {
      showToast('Please fill in all required fields', 'warning');
      return;
    }
    
    const formData = new FormData(this);
    const url = form.attr('action') || window.location.pathname;
    const method = form.attr('method') || 'POST';
    
    $.ajax({
      url: url,
      method: method,
      data: formData,
      processData: false,
      contentType: false,
      success: function(response) {
        showToast('Operation completed successfully', 'success');
        if (successCallback) {
          successCallback(response);
        } else {
          location.reload();
        }
      },
      error: function(xhr) {
        const message = xhr.responseJSON?.error || 'An error occurred';
        showToast(message, 'danger');
      }
    });
  });
}

// Table sorting
function initTableSorting() {
  $('.sortable th').click(function() {
    const table = $(this).closest('table');
    const column = $(this).index();
    const rows = table.find('tbody tr').toArray();
    const isAsc = $(this).hasClass('sort-asc');
    
    // Clear all sort classes
    table.find('th').removeClass('sort-asc sort-desc');
    
    // Add appropriate class
    $(this).addClass(isAsc ? 'sort-desc' : 'sort-asc');
    
    // Sort rows
    rows.sort((a, b) => {
      const aVal = $(a).find('td').eq(column).text().trim();
      const bVal = $(b).find('td').eq(column).text().trim();
      
      if (isAsc) {
        return bVal.localeCompare(aVal);
      } else {
        return aVal.localeCompare(bVal);
      }
    });
    
    // Reorder table
    table.find('tbody').empty().append(rows);
  });
}

// Initialize on document ready
$(document).ready(function() {
  // Initialize Bootstrap tooltips
  const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
  tooltipTriggerList.map(function (tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl);
  });
  
  // Initialize table sorting
  initTableSorting();
  
  // Auto-hide alerts after 5 seconds
  setTimeout(function() {
    $('.alert').fadeOut();
  }, 5000);
});

// Action management functions
function viewAction(actionId) {
  // Implementation for viewing action details
  window.location.href = `/actions/${actionId}`;
}

function editUser(userId) {
  // Implementation for editing user
  window.location.href = `/users/${userId}/edit`;
}

// FMECA calculation helpers
function calculateRPN(severity, occurrence, detectability) {
  return severity * occurrence * detectability;
}

function getCriticalityColor(criticality) {
  switch(criticality) {
    case 'low': return 'success';
    case 'medium': return 'warning';
    case 'high': return 'danger';
    default: return 'secondary';
  }
}

function getPriorityColor(priority) {
  switch(priority) {
    case 'low': return 'success';
    case 'medium': return 'info';
    case 'high': return 'warning';
    case 'urgent': return 'danger';
    default: return 'secondary';
  }
}

function getStatusColor(status) {
  switch(status) {
    case 'open': return 'secondary';
    case 'in_progress': return 'primary';
    case 'blocked': return 'danger';
    case 'done': return 'success';
    case 'cancelled': return 'dark';
    default: return 'secondary';
  }
}
