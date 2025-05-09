#pragma once
#include <cstdint>
#include <cstring>
#include <vector>

class Screenshot {
public:
  int w, h;
  int bitsPerPixel;
  std::vector<char> raw, webp;

  Screenshot();
  void Grab();
};