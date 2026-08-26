jQuery(function ($) {
  const syncPreview = (preview) => {
    const items = preview.children('.avo-gallery-preview__item');
    items.find('.avo-gallery-preview__primary').remove();
    items.first().prepend($('<span />', {
      class: 'avo-gallery-preview__primary',
      text: window.avoAdmin?.primaryLabel || 'Primary',
    }));
    preview.closest('.avo-gallery-field').find('.avo-gallery-ids').val(
      items.map((_index, item) => $(item).data('attachment-id')).get().join(',')
    );
    const count = items.length;
    const template = count === 1
      ? (window.avoAdmin?.imageSelectedSingular || '%d image selected.')
      : (window.avoAdmin?.imageSelectedPlural || '%d images selected.');
    preview.closest('.avo-gallery-field').find('[data-avo-image-count]').text(template.replace('%d', count));
  };

  const previewItem = (attachment) => {
    const thumb = attachment.sizes && attachment.sizes.thumbnail ? attachment.sizes.thumbnail.url : attachment.url;
    const item = $('<span />', { class: 'avo-gallery-preview__item' }).attr('data-attachment-id', attachment.id);
    $('<img />').attr('src', thumb).attr('alt', '').appendTo(item);
    $('<button />', {
      type: 'button',
      class: 'avo-gallery-preview__remove',
      'aria-label': window.avoAdmin?.removeImageLabel || 'Remove image',
      text: '×',
    }).appendTo(item);
    return item;
  };

  const enableSorting = (preview) => {
    if (typeof $.fn.sortable !== 'function' || preview.hasClass('ui-sortable')) {
      return;
    }

    preview.sortable({
      items: '.avo-gallery-preview__item',
      tolerance: 'pointer',
      update: function () { syncPreview($(this)); },
    });
  };

  $('.avo-gallery-preview').each(function () {
    enableSorting($(this));
  });

  $(document).on('click', '.avo-select-gallery', function (event) {
    event.preventDefault();
    const field = $(this).closest('.avo-gallery-field');
    const preview = field.find('.avo-gallery-preview');
    const frame = wp.media({
      title: window.avoAdmin?.frameTitle || 'Select attribute gallery images',
      button: { text: window.avoAdmin?.frameButton || 'Use selected images' },
      multiple: true,
    });

    frame.on('select', function () {
      const attachments = frame.state().get('selection').toJSON();
      const existingIds = new Set(preview.children('.avo-gallery-preview__item').map((_index, item) => String($(item).data('attachment-id'))).get());
      attachments.forEach(function (attachment) {
        if (existingIds.has(String(attachment.id))) return;
        previewItem(attachment).appendTo(preview);
        existingIds.add(String(attachment.id));
      });
      syncPreview(preview);
      enableSorting(preview);
    });

    frame.open();
  });

  $(document).on('click', '.avo-clear-gallery', function (event) {
    event.preventDefault();
    const field = $(this).closest('.avo-gallery-field');
    field.find('.avo-gallery-ids').val('');
    field.find('.avo-gallery-preview').empty();
    syncPreview(field.find('.avo-gallery-preview'));
  });

  $(document).on('click', '.avo-gallery-preview__remove', function (event) {
    event.preventDefault();
    const preview = $(this).closest('.avo-gallery-preview');
    $(this).closest('.avo-gallery-preview__item').remove();
    syncPreview(preview);
  });
});
