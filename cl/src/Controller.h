#pragma once
#include <atomic>
#include <chrono>
#include <condition_variable>
#include <cstdint>
#include <mutex>
#include <queue>
#include <set>
#include <thread>

class Controller {
public:
  struct SequenceMember {
    double mouseX = -1;
    double mouseY = -1;
    double mouseScroll = 0;
    uint16_t key = 0;
    bool keyPressed = false;
    uint32_t button = 0;
    bool buttonPressed = false;
    std::chrono::milliseconds sleepFor = std::chrono::milliseconds(0);
  };

  static void SetMouseLock(bool value);
  void PushSequence(SequenceMember member);
  std::set<uint16_t> GetPressedKeys();
  std::set<uint32_t> GetPressedButtons();

  ~Controller();
  Controller();

private:
  void MoveCursorToNormalized(double x_normalized, double y_normalized);
  void SetKeyState(uint16_t vkCode, bool pressed);
  void PressAndReleaseKey(uint16_t vkCode);

  void SetMouseButtonState(uint32_t buttonFlag, bool pressed);
  void ScrollMouse(int pixels);
  void ScrollMouseHorizontal(int pixels);

  static bool mouseLock;
  static bool keyboardLock;
  std::set<uint16_t> pressedKeys = std::set<uint16_t>();
  std::set<uint32_t> pressedButtons = std::set<uint32_t>();
  std::mutex inputMutex;

  void SequenceWorker();
  std::queue<SequenceMember> sequenceQueue;
  std::mutex queueMutex;
  std::condition_variable queueCV;
  std::thread workerThread;
  std::atomic<bool> stopWorker;
};