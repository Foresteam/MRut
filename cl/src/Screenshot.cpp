#include <webp/encode.h>

#include "Screenshot.h"

#ifdef linux
#include "lodepng/lodepng.h"
#include <X11/Xlib.h>
#include <X11/Xutil.h>
#else
#include <iostream>
#include <windows.h>
// should go after winapi
#include <gdiplus.h>
#pragma comment(lib, "Gdiplus.lib")
#endif

Screenshot::Screenshot() {
  w = h = bitsPerPixel = 0;
  raw = std::vector<char>();
  Grab();
}

#ifdef linux

void PNGConvert(vector<unsigned char>& raw, vector<char>& png) {
  uint8_t* timg = new uint8_t[w * h * 3]();
  for (uint64_t i = 0, j = 0; i < raw.size(); i += 4, j += 3) {
    timg[j] = raw[i + 2];
    timg[j + 1] = raw[i + 1];
    timg[j + 2] = raw[i];
  }
  lodepng::encode(png, timg, w, h, LCT_RGB);
  delete[] timg;
}

void Screenshot::Grab() {
  Display* display = XOpenDisplay(nullptr);
  Window root = DefaultRootWindow(display);

  XWindowAttributes attributes = { 0 };
  XGetWindowAttributes(display, root, &attributes);

  w = attributes.width;
  h = attributes.height;

  XImage* img = XGetImage(display, root, 0, 0, w, h, AllPlanes, ZPixmap);
  bitsPerPixel = img->bits_per_pixel;
  raw.resize(w * h * bitsPerPixel / 8 / sizeof(uint8_t));

  memcpy(&raw[0], img->data, raw.size());

  XDestroyImage(img);
  XCloseDisplay(display);

  PNGConvert(raw, png);
}

#else

int GetEncoderClsid(const WCHAR* format, CLSID* pClsid) {
  UINT num = 0;  // number of image encoders
  UINT size = 0; // size of the image encoder array in bytes

  Gdiplus::GetImageEncodersSize(&num, &size);
  if (size == 0)
    return -1; // Failure

  Gdiplus::ImageCodecInfo* pImageCodecInfo = (Gdiplus::ImageCodecInfo*)(malloc(size));
  if (pImageCodecInfo == NULL)
    return -1; // Failure

  GetImageEncoders(num, size, pImageCodecInfo);

  for (UINT j = 0; j < num; ++j) {
    if (wcscmp(pImageCodecInfo[j].MimeType, format) == 0) {
      *pClsid = pImageCodecInfo[j].Clsid;
      free(pImageCodecInfo);
      return j; // Success
    }
  }

  free(pImageCodecInfo);
  return -1; // Failure
}

void GetWebpBytesFromBitmap(Gdiplus::Bitmap* bitmap, std::vector<char>& webpData, float quality = 75.0f) {
  if (!bitmap)
    return;

  // Get bitmap dimensions
  const UINT width = bitmap->GetWidth();
  const UINT height = bitmap->GetHeight();

  // Lock the bitmap data
  Gdiplus::BitmapData bitmapData;
  Gdiplus::Rect rect(0, 0, width, height);
  if (bitmap->LockBits(&rect, Gdiplus::ImageLockModeRead, PixelFormat32bppARGB, &bitmapData) != Gdiplus::Ok)
    return;

  // Prepare WebP configuration
  WebPConfig config;
  if (!WebPConfigPreset(&config, WEBP_PRESET_DEFAULT, quality)) {
    bitmap->UnlockBits(&bitmapData);
    return;
  }

  // Configure lossy compression (adjust quality)
  config.quality = quality;
  config.method = 6; // Higher method = slower but better compression

  // Encode to WebP
  WebPPicture pic;
  if (!WebPPictureInit(&pic)) {
    bitmap->UnlockBits(&bitmapData);
    return;
  }

  pic.width = width;
  pic.height = height;
  pic.use_argb = 1; // Use ARGB format (matches GDI+)

  // Allocate and copy bitmap data
  if (!WebPPictureImportBGRA(&pic, (const uint8_t*)bitmapData.Scan0, bitmapData.Stride)) {
    WebPPictureFree(&pic);
    bitmap->UnlockBits(&bitmapData);
    return;
  }

  // Set up memory writer
  WebPMemoryWriter writer;
  WebPMemoryWriterInit(&writer);
  pic.writer = WebPMemoryWrite;
  pic.custom_ptr = &writer;

  // Encode to WebP
  if (!WebPEncode(&config, &pic)) {
    WebPPictureFree(&pic);
    bitmap->UnlockBits(&bitmapData);
    return;
  }

  // Copy output to vector
  webpData.assign(writer.mem, writer.mem + writer.size);

  // Cleanup
  WebPPictureFree(&pic);
  bitmap->UnlockBits(&bitmapData);
}

void Screenshot::Grab() {
  int x = GetSystemMetrics(SM_XVIRTUALSCREEN);
  int y = GetSystemMetrics(SM_YVIRTUALSCREEN);
  int w = GetSystemMetrics(SM_CXSCREEN); // Primary monitor width
  int h = GetSystemMetrics(SM_CYSCREEN); // Primary monitor height

  if (w <= 0 || h <= 0)
    return;

  HDC hScreen = GetDC(HWND_DESKTOP);
  HDC hDc = CreateCompatibleDC(hScreen);
  HBITMAP hBitmap = CreateCompatibleBitmap(hScreen, w, h);
  HGDIOBJ old_obj = SelectObject(hDc, hBitmap);
  BitBlt(hDc, 0, 0, w, h, hScreen, x, y, SRCCOPY);

  Gdiplus::Bitmap bitmap(hBitmap, NULL);

  GetWebpBytesFromBitmap(&bitmap, webp);

  SelectObject(hDc, old_obj);
  DeleteDC(hDc);
  ReleaseDC(HWND_DESKTOP, hScreen);
  DeleteObject(hBitmap);
}

#endif