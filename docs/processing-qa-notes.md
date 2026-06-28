# Processing QA Notes

These notes track client-side processing scenarios that should be covered as the app becomes more productized.

## Performance Scenarios

- Compare color and grayscale processing on the same photo, especially images with gradients, water, sky, skin, or noisy shadows.
- Test large source images after browser-side resizing, and record phase timings for preparing, region building, and export.
- Test simple low-color images with clean shapes to confirm the progress UI does not feel unnecessarily heavy.
- Test noisy or detail-heavy images to verify long facet reduction shows activity, elapsed time, and quiet-state reassurance.

## Device And Viewport Scenarios

- Use browser CPU throttling to simulate lower-performance client machines.
- Verify desktop, tablet, and narrow mobile widths while processing.
- Confirm preview image, phase labels, elapsed time, and cancel action do not overlap.
- Confirm cancel remains responsive during long-running reduction work.

## Privacy/Product Follow-Up

- Future FAQ or EULA copy should state that uploaded images are processed locally in the browser.
- Clarify that image data does not need to leave the user's machine for normal processing.
- Keep privacy copy product-facing and plain-language; legal review can refine wording before launch.
