local n = math.random(1, 100);
dialog.Ok('', 'Угадай-ка число от 1 до 100', dialog.type.WARNING);
while true do
  local userInput = tonumber(dialog.Input('Enter number'));
  if not userInput then
    dialog.Ok('', 'Игра завершена.', dialog.type.ERROR);
    return
  end

  if userInput < n then
    dialog.Ok('', 'Число больше ' .. userInput .. '!', dialog.type.BLANK);
  elseif userInput > n then
    dialog.Ok('', 'Число меньше ' .. userInput .. '!', dialog.type.BLANK);
  else
    break
  end
end
dialog.Ok('', 'Вы победили!', dialog.type.INFO);