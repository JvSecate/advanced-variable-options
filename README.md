# Advanced Variable Options

A WordPress plugin for WooCommerce variable products that adds attribute image galleries, image-based swatches, and size availability controls.

---

## Features

- **Attribute image galleries** - assign multiple Media Library images to any product attribute option, such as `Color > Red`
- **Image swatches** - use the first assigned image as the storefront swatch instead of a flat color chip
- **Variation fallback images** - fall back to variation images when no attribute gallery is assigned
- **Grouped gallery thumbnails** - gallery thumbnails include saved attribute images and expose attribute metadata for filtering
- **Size availability buttons** - render available/unavailable size buttons based on the selected visual option
- **Attribute auto-detection** - detects visual attributes from saved galleries first, then common names like color, texture, material, or model
- **Theme helpers** - exposes PHP render functions so custom themes can place swatches exactly where needed
- **Debranded markup** - frontend classes and data attributes use the neutral `avo-*` prefix

---

## Requirements

| Requirement | Minimum |
|---|---|
| WordPress | 6.0 |
| PHP | 7.4 |
| WooCommerce | 7.0 |

---

## Installation

1. Upload the `advanced-variable-options` plugin folder to `/wp-content/plugins/`
2. Activate the plugin through **Plugins -> Installed Plugins**
3. Edit a variable WooCommerce product
4. Open the **Attribute Galleries** product data tab
5. Add images to the attribute options you want to display as swatches
6. Save the product

---

## Adding Attribute Galleries

1. Edit a variable product
2. Make sure the product has attributes and variations
3. Open **Product data -> Attribute Galleries**
4. Find the attribute option, for example `Color -> Red`
5. Click **Select images**
6. Choose one or more images from the Media Library
7. Save or update the product

The first image assigned to an option is used as the swatch image. All selected images are included in the product gallery helper output.

---

## Theme Integration

Use these functions in a theme template where you want the controls to appear:

```php
<?php
if (function_exists('avo_render_product_option_swatches')) {
    avo_render_product_option_swatches($product, 'card');
}
?>
```

For single product pages:

```php
<?php
if (function_exists('avo_render_product_gallery_thumbnails')) {
    avo_render_product_gallery_thumbnails($product);
}

if (function_exists('avo_render_product_option_swatches')) {
    avo_render_product_option_swatches($product, 'detail');
}

if (function_exists('avo_render_product_size_availability')) {
    avo_render_product_size_availability($product);
}
?>
```

The plugin outputs neutral frontend selectors such as `.avo-product-swatches`, `.avo-product-swatch`, `.avo-gallery-thumbs`, `.avo-gallery-thumb`, `.avo-size-options`, and `.avo-size-option`.

---

## Useful Helper Functions

```php
avo_get_attribute_galleries($product_id);
avo_get_default_attribute_options($product_id);
avo_get_default_attribute_value($product_id, $attribute_key);
avo_get_gallery_for_attribute_value($product_id, $attribute_key, $value);
avo_detect_visual_attribute_key($product);
avo_detect_size_attribute_key($product);
avo_get_visual_variation_swatches($product, $context = 'card');
avo_get_product_gallery_items($product);
avo_render_product_option_swatches($product, $context = 'card');
avo_render_product_gallery_thumbnails($product);
avo_render_product_size_availability($product);
```

---

## Filters

Customize the attribute names used for auto-detection:

```php
add_filter('avo_visual_attribute_needles', function ($needles) {
    $needles[] = 'pattern';
    return $needles;
});

add_filter('avo_size_attribute_needles', function ($needles) {
    $needles[] = 'fit';
    return $needles;
});
```

---

## Data Storage

Attribute galleries are stored on the product in post meta:

```text
_avo_attribute_galleries
```

Default attribute options are stored separately:

```text
_avo_default_attribute_options
```

The structure is:

```php
[
    'pa_color' => [
        'red' => [123, 456, 789],
    ],
]
```

Default option structure:

```php
[
    'pa_color' => 'red',
]
```
