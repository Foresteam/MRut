--"%s--"
printBuf = {}
isStreaming = false
capturedInputs = false
ACTIONS = {
	IDLE = 0,
	FEEDBACK = 1,
	FILE = 2,
	SCREENCAST = 3,
	HANDSHAKE = 4
}

MOUSE_BUTTONS = {
	LEFT    = 0x0002,
	RIGHT   = 0x0008,
	MIDDLE  = 0x0020,
	XBUTTON1 = 0x0080,
	XBUTTON2 = 0x0100
}

SPECIAL_KEYS = {
	ENTER = 0x0D,       
	ESCAPE = 0x1B,      
	BACKSPACE = 0x08,   
	TAB = 0x09,
	SHIFT = 0x10,       
	CONTROL = 0x11,     
	ALT = 0x12,
	META = 0x5B,        
	PAUSE = 0x13,       
	CAPS_LOCK = 0x14,   
	CONTEXT_MENU = 0x5D,
	ARROW_UP = 0x26,    
	ARROW_DOWN = 0x28,  
	ARROW_LEFT = 0x25,  
	ARROW_RIGHT = 0x27, 
	PAGE_UP = 0x21,     
	PAGE_DOWN = 0x22,   
	END = 0x23,
	HOME = 0x24,        
	INSERT = 0x2D,      
	DELETE = 0x2E,      
	F1 = 0x70,
	F2 = 0x71,
	F3 = 0x72,
	F4 = 0x73,
	F5 = 0x74,
	F6 = 0x75,
	F7 = 0x76,
	F8 = 0x77,
	F9 = 0x78,
	F10 = 0x79,
	F11 = 0x7A,
	F12 = 0x7B,
	NUM_LOCK = 0x90,    
	SCROLL_LOCK = 0x91, 
	PRINT_SCREEN = 0x2C, 
	VOLUME_MUTE = 0xAD,
	VOLUME_DOWN = 0xAE,
	VOLUME_UP = 0xAF, 
	MEDIA_TRACK_NEXT = 0xB0,    
	MEDIA_TRACK_PREVIOUS = 0xB1,
	MEDIA_STOP = 0xB2,
	MEDIA_PLAY_PAUSE = 0xB3,    
}

function Print(...)
	args = table.pack(...)
	for i = 1, #args do
		args[i] = tostring(args[i])
	end
	table.insert(printBuf, table.concat(args, '\t'))
end
function PrintFailure()
	table.insert(printBuf, 'false')
end
string.split = function(inputstr, sep)
	if sep == nil then
		sep = "%s"
	end
	local t = {}
	for str in string.gmatch(inputstr, "([^" .. sep .. "]+)") do
		table.insert(t, str)
	end
	return t
end

function FileExists(filename)
	local f = io.open(filename, "r")
	if f then f:close() end
	return f ~= nil
end
-- function FileRead(filename)
-- 	local file = io.open(filename, 'rb')
-- 	local result = file:read('a')
-- 	file:close()
-- 	return result
-- end
-- function FileWrite(filename, data)
-- 	local file = io.open(filename, "wb")
-- 	file:write(data)
-- 	file:close()
-- end

function SendFile(filename)
	if FileExists(filename) then
		net.SendFile(ACTIONS.FILE, filename)
	else
		Print('File doesn\'t seem to exist')
	end
end
function ReceiveFile(filename)
	if net.ReceiveFile(filename) then
		Print('File received: ' .. filename)
	else
		Print('File reception returned error code (how?)')
	end
end

function Exec(command)
	Print(_Exec(command))
end

function FixSlashes(s)
	return s:gsub('\\', '/')
end

function PrintTable(tbl, indent)
  if not indent then indent = 0 end
  for k, v in pairs(tbl) do
    formatting = string.rep("  ", indent) .. k .. ": "
    if type(v) == "table" then
      print(formatting)
      PrintTable(v, indent+1)
    elseif type(v) == 'boolean' then
      print(formatting .. tostring(v))      
    else
      print(formatting .. v)
    end
  end
end

function ListDisks()
	local disks = fs.ListDisks()
	for _, disk in pairs(disks) do
		disk.path = disk.name:gsub(':$', ':/')
		disk.name = nil
		table.insert(printBuf, JSON.encode(disk))
	end
end
function ListDirectory(path)
	local list = fs.ListDirectory(path)
	if #list == 0 then
		table.insert(printBuf, 'false')
		print(0)
		return
	end
	for _, entry in pairs(list) do
		entry.type = entry.isDirectory and 'dir' or 'file'
		entry.isDirectory = nil
		entry.path = FixSlashes(path) .. '/' .. entry.name
		table.insert(printBuf, JSON.encode(entry))
	end
end
function MkDir(path)
	local cmd = 'mkdir "' .. FixSlashes(path:gsub('"', '\\"')) .. '"'
	Exec(cmd)
	Print(cmd)
end
function Touch(path)
	local cmd = 'echo "" > "' .. FixSlashes(path:gsub('"', '\\"')) .. '"'
	Exec(cmd)
	Print(cmd)
end
function Delete(path)
	if fs.Rm(path) then
		Print('rm ' .. path)
	else
		PrintFailure()
	end
end
function Move(sourcePaths, destPath)
	if fs.Move(sourcePaths, destPath) then
		Print('move ' .. JSON.encode(sourcePaths) .. ' ' .. destPath)
	else
		PrintFailure()
	end
end
function Copy(sourcePaths, destPath)
	if fs.Copy(sourcePaths, destPath) then
		Print('copy ' .. JSON.encode(sourcePaths) .. ' ' .. destPath)
	else
		PrintFailure()
	end
end
function Rename(sourcePath, destPath)
	if fs.Rename(sourcePath, destPath) then
		Print('rename ' .. sourcePath .. ' ' .. destPath)
	else
		PrintFailure()
	end
end
function ListPlaces(path)
	local list = fs.ListPlaces(path)
	for name, path in pairs(list) do
		table.insert(printBuf, JSON.encode({ name = name, path = FixSlashes(path) }))
	end
end
function RunFileAsScript(path)
	local code = fs.ReadFile(path)
	load(code)()
end

function Logs()
	local logs = fs.ReadFileLines(CONFIG.logFileName)
	for _, log in pairs(logs) do
		Print(log)
	end
end

function GetHostname()
	local s = _Exec('hostname') or ''
	return string.sub(s, 1, #s - 1 < 0 and 0 or #s - 1)
end
function GetUsername()
	local s = _Exec('echo %USERNAME%') or ''
	return string.sub(s, 1, #s - 1 < 0 and 0 or #s - 1)
end

function SetIsStreaming(value)
	isStreaming = value
	if not value then
		capturedInputs = false
	end
end

function MouseLeftClick()
	input.MouseSetPressed(MOUSE_BUTTONS.LEFT, true)
	input.Delay(50)
	input.MouseSetPressed(MOUSE_BUTTONS.LEFT, false)
end
function MouseRightClick()
	input.MouseSetPressed(MOUSE_BUTTONS.RIGHT, true)
	input.Delay(50)
	input.MouseSetPressed(MOUSE_BUTTONS.RIGHT, false)
end
function MouseMiddleClick()
	input.MouseSetPressed(MOUSE_BUTTONS.MIDDLE, true)
	input.Delay(50)
	input.MouseSetPressed(MOUSE_BUTTONS.MIDDLE, false)
end
function InputDelaySinceStart(delayMs)
	delayMs = delayMs - (GetTimeMs() - START_TIME)
	-- if delayMs < -1500 then return end
	input.Delay(math.max(10, delayMs))
end
function DialogInput(...)
	local text = dialog.Input(...)
	table.insert(printBuf, text)
end
function DialogOk(...)
	dialog.Ok(...)
	table.insert(printBuf, 'true')
end
function DialogConfirm(...)
	local agree = dialog.Confirm(...)
	table.insert(printBuf, agree and 'true' or 'false')
end

print('startup ok')