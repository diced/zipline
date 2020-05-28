# TypeX Uploaders
These uploaders are made with ShareX in mind, but can be adapted to other uploaders.
Please make a Pull Request with other uploader configurations with the scheme of
`uploader_type.json`.

## Images
Images are sent to the `/api/upload/` endpoint with Multipart Form-Data. The payload key is `file`.

---

## URLs
URLs are sent to the `/api/shorten/` endpoint with raw data. The payload key is `url`.