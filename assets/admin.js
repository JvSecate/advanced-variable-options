jQuery(function ($) {
  $('.woocommerce_options_panel').on('click', '.avo-select-gallery', function (event) {
    event.preventDefault();
    const field = $(this).closest('.avo-gallery-field');
    const input = field.find('.avo-gallery-ids');
    const preview = field.find('.avo-gallery-preview');
    const frame = wp.media({
      title: window.avoAdmin?.frameTitle || 'Select attribute gallery images',
      button: { text: window.avoAdmin?.frameButton || 'Use selected images' },
      multiple: true,
    });

    frame.on('select', function () {
      const attachments = frame.state().get('selection').toJSON();
      input.val(attachments.map((attachment) => attachment.id).join(','));
      preview.empty();
      attachments.forEach(function (attachment) {
        const thumb = attachment.sizes && attachment.sizes.thumbnail ? attachment.sizes.thumbnail.url : attachment.url;
        $('<img />').attr('src', thumb).attr('alt', '').appendTo(preview);
      });
    });

    frame.open();
  });

  $('.woocommerce_options_panel').on('click', '.avo-clear-gallery', function (event) {
    event.preventDefault();
    const field = $(this).closest('.avo-gallery-field');
    field.find('.avo-gallery-ids').val('');
    field.find('.avo-gallery-preview').empty();
  });
});
