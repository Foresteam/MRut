#include "Controller.h"
#include <algorithm>
#include <windows.h>

bool Controller::mouseLock = false;
bool Controller::keyboardLock = false;

void Controller::MoveCursorToNormalized(double x_normalized, double y_normalized) {
  // Validate input range
  x_normalized = std::clamp(x_normalized, 0.0, 1.0);
  y_normalized = std::clamp(y_normalized, 0.0, 1.0);

  // Get primary monitor dimensions
  const int screenWidth = GetSystemMetrics(SM_CXSCREEN);
  const int screenHeight = GetSystemMetrics(SM_CYSCREEN);

  // Convert normalized to absolute coordinates
  const int absoluteX = static_cast<int>(x_normalized * (screenWidth - 1));
  const int absoluteY = static_cast<int>(y_normalized * (screenHeight - 1));

  // Move the cursor
  SetCursorPos(absoluteX, absoluteY);
}

void Controller::SetKeyState(uint16_t vkCode, bool pressed) {
  INPUT input = { 0 };
  input.type = INPUT_KEYBOARD;
  input.ki.wVk = vkCode;
  input.ki.dwFlags = pressed ? 0 : KEYEVENTF_KEYUP;

  {
    std::lock_guard<std::mutex> lock(inputMutex);
    if (pressed)
      pressedKeys.insert(vkCode);
    else
      pressedKeys.erase(vkCode);
  }

  SendInput(1, &input, sizeof(INPUT));
}

// Example: Press and release the 'A' key
void Controller::PressAndReleaseKey(uint16_t vkCode) {
  SetKeyState(vkCode, true);  // Key down
  Sleep(50);                  // Optional delay (milliseconds)
  SetKeyState(vkCode, false); // Key up
}

void Controller::SetMouseButtonState(uint32_t buttonFlag, bool pressed) {
  INPUT input = { 0 };
  input.type = INPUT_MOUSE;
  input.mi.dwFlags = pressed ? buttonFlag : (buttonFlag << 1); // Release flag = buttonFlag << 1

  {
    std::lock_guard<std::mutex> lock(inputMutex);
    if (pressed)
      pressedButtons.insert(buttonFlag);
    else
      pressedButtons.erase(buttonFlag);
  }

  SendInput(1, &input, sizeof(INPUT));
}

// Scrolls the mouse wheel by a specified number of pixels
// - positive pixels = scroll up
// - negative pixels = scroll down
void Controller::ScrollMouse(int pixels) {
  INPUT input = { 0 };
  input.type = INPUT_MOUSE;

  // Windows expects multiples of WHEEL_DELTA (120) for wheel messages
  int scrollUnits = pixels * WHEEL_DELTA / 30; // 30 pixels ≈ 1 notch

  input.mi.dwFlags = MOUSEEVENTF_WHEEL;
  input.mi.mouseData = static_cast<DWORD>(scrollUnits);

  SendInput(1, &input, sizeof(INPUT));
}

// Horizontal scroll (if supported by mouse)
void Controller::ScrollMouseHorizontal(int pixels) {
  INPUT input = { 0 };
  input.type = INPUT_MOUSE;

  int scrollUnits = pixels * WHEEL_DELTA / 30;

  input.mi.dwFlags = MOUSEEVENTF_HWHEEL;
  input.mi.mouseData = static_cast<DWORD>(scrollUnits);

  SendInput(1, &input, sizeof(INPUT));
}

// Global hook handle (automatically released when DLL unloads)
HHOOK g_mouseHook = nullptr;

// Low-level mouse hook procedure
LRESULT CALLBACK MouseHookProc(int nCode, WPARAM wParam, LPARAM lParam) {
  if (nCode >= 0) {
    // Block all mouse events
    return 1;
  }
  // Pass to next hook
  return CallNextHookEx(g_mouseHook, nCode, wParam, lParam);
}

// Enable/disable mouse blocking
void Controller::SetMouseLock(bool value) {
  if (value && !g_mouseHook) {
    g_mouseHook = SetWindowsHookEx(WH_MOUSE_LL, MouseHookProc, GetModuleHandle(nullptr), 0);
  }
  else if (!value && g_mouseHook) {
    UnhookWindowsHookEx(g_mouseHook);
    g_mouseHook = nullptr;
  }
}

// Auto-cleanup on exit (optional but good practice)
struct MouseHookCleanup {
  ~MouseHookCleanup() {
    Controller::SetMouseLock(false);
  }
} g_cleanup;

Controller::Controller() {
  stopWorker = false;
  workerThread = std::thread(&Controller::SequenceWorker, this);
}
Controller::~Controller() {
  stopWorker = true;
  queueCV.notify_all();
  if (workerThread.joinable())
    workerThread.join();
}

void Controller::PushSequence(SequenceMember member) {
  {
    std::lock_guard<std::mutex> lock(queueMutex);
    sequenceQueue.push(member);
  }
  queueCV.notify_one();
}

void Controller::SequenceWorker() {
  while (!stopWorker) {
    SequenceMember member;
    {
      std::unique_lock<std::mutex> lock(queueMutex);
      queueCV.wait(lock, [this] { return !sequenceQueue.empty() || stopWorker; });

      if (stopWorker && sequenceQueue.empty())
        break;

      member = sequenceQueue.front();
      sequenceQueue.pop();
    }

    // Simulate action
    if (member.mouseX >= 0 && member.mouseY >= 0)
      MoveCursorToNormalized(member.mouseX, member.mouseY);
    if (member.mouseScroll != 0)
      ScrollMouse(member.mouseScroll);
    if (member.key)
      SetKeyState(member.key, member.keyPressed);
    if (member.button)
      SetMouseButtonState(member.button, member.buttonPressed);
    if (member.sleepFor > std::chrono::milliseconds(0))
      std::this_thread::sleep_for(member.sleepFor);
  }
}

std::set<uint16_t> Controller::GetPressedKeys() {
  std::lock_guard<std::mutex> lock(inputMutex);
  return pressedKeys;
}

std::set<uint32_t> Controller::GetPressedButtons() {
  std::lock_guard<std::mutex> lock(inputMutex);
  return pressedButtons;
}