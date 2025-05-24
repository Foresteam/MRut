START_TIME = GetTimeMs()
input.MouseSetLocked(false)
input.KeyboardSetLocked(false)

print('handshake...')
net.Send(
	ACTIONS.HANDSHAKE,
	JSON.encode({
		hostname = GetHostname(),
		timestampMs = START_TIME,
		username = GetUsername(),
		hwid = GetHwid()
		-- tls...
	})
)
local handshakeResultJson = net.Receive()
local handshakeResult = JSON.decode(handshakeResultJson)
print('handshake result:', handshakeResultJson)

local doExit = false
function Exit()
	doExit = true
end

print('entered main cycle')
local lastCommandEmpty = false
while true do
	local roundtripStart, roundtripAfterSend, roundtripAfterReceive, roundtripAfterSendFeedback, roundtripScreencast = nil, nil, nil, nil, nil
	roundtripStart = GetTimeMs()
	net.Send(ACTIONS.IDLE)
	roundtripAfterSend = GetTimeMs()
	local command = net.Receive()
	roundtripAfterReceive = GetTimeMs()
	if #command > 0 then
		if not pcall(load(command)) then
			error('Failed to execute' .. command)
		end
		local feedback = table.concat(printBuf, '\n')
		if #feedback > 0 then
			net.Send(ACTIONS.FEEDBACK, feedback)
			roundtripAfterSendFeedback = GetTimeMs()
		end
		for k in pairs(printBuf) do
			printBuf[k] = nil
		end
		lastCommandEmpty = false
	else
		lastCommandEmpty = true
	end
	if isStreaming then
		net.Screencast()
		roundtripScreencast = GetTimeMs()
		print('Screencast!')
	end
	if doExit then
		return true
	end
	print(
		'lua roundtrip',
		GetTimeMs() - roundtripStart,
		roundtripAfterSend - roundtripStart,
		roundtripAfterReceive - roundtripAfterSend,
		roundtripAfterSendFeedback ~= nil and roundtripAfterSendFeedback - roundtripAfterReceive or 0,
		roundtripScreencast ~= nil and (roundtripScreencast - (roundtripAfterSendFeedback or roundtripAfterReceive)) or 0
	)
	if lastCommandEmpty or isStreaming then
		Sleep(300)
	else
		Sleep(50)
	end
end