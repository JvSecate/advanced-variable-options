(() => {
  const slugify = (value) => String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const escapeName = (value) => {
    if (window.CSS && typeof window.CSS.escape === 'function') {
      return window.CSS.escape(value);
    }
    return String(value || '').replace(/"/g, '\\"');
  };

  const normalizeAttributeKey = (key) => (
    key && key.startsWith('attribute_') ? key : `attribute_${String(key || '').replace(/^attribute_/, '')}`
  );

  const setMainImage = (scope, imageUrl, fullUrl = '') => {
    if (!imageUrl || !scope) return;
    const img = scope.querySelector('.woocommerce-product-gallery__image img, .wp-post-image, .product-media img');
    if (!img) return;
    if (!img.dataset.avoOriginalSrc) img.dataset.avoOriginalSrc = img.currentSrc || img.src;
    img.src = imageUrl;
    img.srcset = '';
    img.sizes = '';
    const link = img.closest('a');
    if (link && link.closest('.woocommerce-product-gallery')) link.href = fullUrl || imageUrl;
  };

  const setCardDefaultImage = (card, swatch) => {
    const imageUrl = swatch?.getAttribute('data-avo-swatch-image') || '';
    const img = card?.querySelector('.product-media img');
    if (!imageUrl || !img) return;
    img.src = imageUrl;
    img.srcset = '';
    img.sizes = '';
    img.dataset.avoOriginalSrc = imageUrl;
  };

  const setSelectValue = (form, rawName, value, dispatchChange = true) => {
    const name = normalizeAttributeKey(rawName);
    const select = form?.querySelector(`select[name="${escapeName(name)}"]`);
    if (!select) return false;
    const target = slugify(value);
    let matched = false;
    Array.from(select.options).forEach((option) => {
      if (option.value === value || slugify(option.value) === target) {
        select.value = option.value;
        matched = true;
      }
    });
    if (dispatchChange) {
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
    return matched;
  };

  const getVariations = (form) => {
    if (!form) return [];

    const raw = form.getAttribute('data-product_variations') || form.dataset.product_variations || '';
    if (raw && raw !== 'false') {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        return [];
      }
    }

    if (window.jQuery) {
      const variations = window.jQuery(form).data('product_variations');
      if (Array.isArray(variations)) {
        return variations;
      }
    }

    return [];
  };

  const getVariationById = (form, variationId) => {
    const target = Number(variationId || 0);
    if (!target) return null;

    return getVariations(form).find((variation) => Number(variation?.variation_id || 0) === target) || null;
  };

  const applyVariationToForm = (form, variation, fallbackAttributes = {}) => {
    if (!form) return;

    const attributes = (variation && variation.attributes) || fallbackAttributes || {};
    Object.entries(attributes).forEach(([key, value]) => setSelectValue(form, key, value, false));

    const variationInput = form.querySelector('input[name="variation_id"]');
    if (variationInput) {
      variationInput.value = variation?.variation_id ? String(variation.variation_id) : '';
    }

    triggerWoo(form);
  };

  const triggerWoo = (form) => {
    if (!form || !window.jQuery) return;
    const $form = window.jQuery(form);
    $form
      .trigger('woocommerce_variation_select_change')
      .trigger('check_variations')
      .trigger('woocommerce_update_variation_values');
  };

  const attrsFrom = (swatch) => {
    try {
      return JSON.parse(swatch.getAttribute('data-avo-variation-attributes') || '{}') || {};
    } catch (e) {
      return {};
    }
  };

  const visualOnlyAttrs = (swatch) => {
    const key = swatch.getAttribute('data-avo-visual-attribute') || '';
    const value = swatch.getAttribute('data-avo-visual-value') || '';
    return key && value ? { [key]: value } : attrsFrom(swatch);
  };

  const updateUrl = (detailWrap) => {
    const form = detailWrap?.querySelector('form.variations_form');
    if (!form) return;
    const url = new URL(window.location.href);
    form.querySelectorAll('select[name^="attribute_"]').forEach((select) => {
      if (select.value) {
        url.searchParams.set(select.name, select.value);
      } else {
        url.searchParams.delete(select.name);
      }
    });
    window.history.replaceState({}, '', url.toString());
  };

  const updateGalleryThumbs = (detailWrap, visualValue = '') => {
    const gallery = detailWrap?.querySelector('.product-gallery');
    if (!gallery) return;
    const target = slugify(visualValue);
    const thumbs = Array.from(gallery.querySelectorAll('[data-avo-gallery-image]'));
    if (!thumbs.length) return;

    thumbs.forEach((thumb) => {
      const value = thumb.getAttribute('data-avo-gallery-visual-value') || '';
      const isGlobal = !value;
      const matches = !target || isGlobal || slugify(value) === target;
      thumb.hidden = !matches;
      thumb.classList.toggle('is-avo-hidden', !matches);
      if (!matches) thumb.classList.remove('is-selected');
    });

    const visible = thumbs.filter((thumb) => !thumb.hidden);
    if (visible.length && !visible.some((thumb) => thumb.classList.contains('is-selected'))) {
      visible[0].classList.add('is-selected');
    }
  };

  const updateSizes = (detailWrap, visualValue) => {
    const block = detailWrap?.querySelector('[data-avo-size-options]');
    if (!block) return;
    let map = {};
    try {
      map = JSON.parse(block.getAttribute('data-avo-size-map') || '{}');
    } catch (e) {
      map = {};
    }
    const visualMap = map[slugify(visualValue)] || map[visualValue] || map.all || {};
    block.querySelectorAll('[data-avo-size-value]').forEach((button) => {
      const value = button.getAttribute('data-avo-size-value') || '';
      const available = Boolean(visualMap[value] || visualMap[slugify(value)]);
      button.classList.toggle('is-unavailable', !available);
      button.classList.remove('is-selected');
      button.setAttribute('aria-disabled', available ? 'false' : 'true');
    });
  };

  const syncSelectionFromForm = (detailWrap) => {
    const form = detailWrap?.querySelector('form.variations_form');
    if (!form) return;
    const params = new URLSearchParams(window.location.search);
    const variationId = Number(params.get('variation_id') || 0);
    const urlAttributes = Array.from(params.entries()).reduce((accumulator, [key, value]) => {
      if (key.startsWith('attribute_')) {
        accumulator[normalizeAttributeKey(key)] = slugify(value);
      }
      return accumulator;
    }, {});

    const selectedSwatch = Array.from(detailWrap.querySelectorAll('.avo-product-swatches--detail .avo-product-swatch')).find((swatch) => {
      if (variationId && Number(swatch.getAttribute('data-avo-variation-id') || 0) === variationId) {
        return true;
      }

      if (!Object.keys(urlAttributes).length) {
        return false;
      }

      const swatchAttributes = attrsFrom(swatch);
      return Object.entries(urlAttributes).every(([key, value]) => slugify(swatchAttributes[key] || '') === value);
    }) || detailWrap.querySelector('.avo-product-swatches--detail .avo-product-swatch.is-selected')
      || detailWrap.querySelector('.avo-product-swatches--detail .avo-product-swatch[data-avo-default-option="true"]')
      || detailWrap.querySelector('.avo-product-swatches--detail .avo-product-swatch');

    if (selectedSwatch) {
      detailWrap.querySelectorAll('.avo-product-swatch').forEach((el) => {
        el.classList.remove('is-selected');
        el.setAttribute('aria-pressed', 'false');
      });

      selectedSwatch.classList.add('is-selected');
      selectedSwatch.setAttribute('aria-pressed', 'true');
      applyVariationToForm(form, getVariationById(form, selectedSwatch.getAttribute('data-avo-variation-id')), visualOnlyAttrs(selectedSwatch));
      updateSizes(detailWrap, selectedSwatch.getAttribute('data-avo-visual-value') || 'all');
      updateGalleryThumbs(detailWrap, selectedSwatch.getAttribute('data-avo-visual-value') || '');
      setMainImage(detailWrap, selectedSwatch.getAttribute('data-avo-swatch-image'));
      updateUrl(detailWrap);
      return;
    }

    params.forEach((value, key) => {
      if (key.startsWith('attribute_')) setSelectValue(form, key, value);
    });
    triggerWoo(form);
  };

  document.addEventListener('mouseover', (event) => {
    const swatch = event.target.closest('[data-avo-swatch-image]');
    if (!swatch || swatch.getAttribute('aria-disabled') === 'true') return;
    setMainImage(swatch.closest('.product-card, .product-detail-wrap'), swatch.getAttribute('data-avo-swatch-image'));
  });

  document.addEventListener('mouseout', (event) => {
    const swatch = event.target.closest('[data-avo-swatch-image]');
    const card = swatch?.closest('.product-card');
    const img = card?.querySelector('.product-media img');
    if (img?.dataset.avoOriginalSrc) img.src = img.dataset.avoOriginalSrc;
  });

  document.addEventListener('click', (event) => {
    const swatch = event.target.closest('[data-avo-swatch-image]');
    if (!swatch || swatch.getAttribute('aria-disabled') === 'true') return;
    const detailWrap = swatch.closest('.product-detail-wrap');
    if (!detailWrap) return;
    event.preventDefault();
    detailWrap.querySelectorAll('.avo-product-swatch').forEach((el) => {
      el.classList.remove('is-selected');
      el.setAttribute('aria-pressed', 'false');
    });
    swatch.classList.add('is-selected');
    swatch.setAttribute('aria-pressed', 'true');
    setMainImage(detailWrap, swatch.getAttribute('data-avo-swatch-image'));
    const form = detailWrap.querySelector('form.variations_form');
    applyVariationToForm(form, getVariationById(form, swatch.getAttribute('data-avo-variation-id')), visualOnlyAttrs(swatch));
    updateSizes(detailWrap, swatch.getAttribute('data-avo-visual-value') || 'all');
    updateGalleryThumbs(detailWrap, swatch.getAttribute('data-avo-visual-value') || '');
    updateUrl(detailWrap);
  });

  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-avo-size-value]');
    if (!button) return;
    event.preventDefault();
    if (button.classList.contains('is-unavailable') || button.getAttribute('aria-disabled') === 'true') return;
    const detailWrap = button.closest('.product-detail-wrap');
    const block = button.closest('[data-avo-size-options]');
    const form = detailWrap?.querySelector('form.variations_form');
    if (!block || !form) return;
    block.querySelectorAll('[data-avo-size-value]').forEach((el) => el.classList.remove('is-selected'));
    button.classList.add('is-selected');
    setSelectValue(form, block.getAttribute('data-avo-size-attribute'), button.getAttribute('data-avo-size-value') || '');
    triggerWoo(form);
    updateUrl(detailWrap);
  });

  document.addEventListener('click', (event) => {
    const thumb = event.target.closest('[data-avo-gallery-image]');
    if (!thumb || thumb.hidden) return;
    event.preventDefault();
    const gallery = thumb.closest('.product-gallery');
    gallery?.querySelectorAll('.avo-gallery-thumb').forEach((el) => el.classList.remove('is-selected'));
    thumb.classList.add('is-selected');
    setMainImage(gallery, thumb.getAttribute('data-avo-gallery-image'), thumb.getAttribute('data-avo-gallery-full'));
  });

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.product-card').forEach((card) => {
      const selected = card.querySelector('.avo-product-swatches--card .avo-product-swatch.is-selected')
        || card.querySelector('.avo-product-swatches--card .avo-product-swatch[data-avo-default-option="true"]')
        || card.querySelector('.avo-product-swatches--card .avo-product-swatch');
      if (selected) {
        setCardDefaultImage(card, selected);
      }
    });

    const detailWrap = document.querySelector('.product-detail-wrap');
    const form = detailWrap?.querySelector('form.variations_form');
    if (!detailWrap || !form) return;
    form.querySelectorAll('.variations select').forEach((select) => select.closest('tr, .value')?.classList.add('avo-hidden-variation-row'));
    form.querySelector('.reset_variations')?.classList.add('avo-hidden-variation-reset');
    syncSelectionFromForm(detailWrap);
    const selected = detailWrap.querySelector('.avo-product-swatches--detail .avo-product-swatch.is-selected')
      || detailWrap.querySelector('.avo-product-swatches--detail .avo-product-swatch');
    if (selected) {
      applyVariationToForm(form, getVariationById(form, selected.getAttribute('data-avo-variation-id')), visualOnlyAttrs(selected));
      updateSizes(detailWrap, selected.getAttribute('data-avo-visual-value') || 'all');
      updateGalleryThumbs(detailWrap, selected.getAttribute('data-avo-visual-value') || '');
      setMainImage(detailWrap, selected.getAttribute('data-avo-swatch-image'));
      triggerWoo(form);
    }
  });
})();
