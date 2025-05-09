import fs from 'fs';
import aes from 'js-crypto-aes';

const bytesToString = bytes => Array.from(bytes)
	.map(b => '\\x' + b.toString(16).padStart(2, '0'))
	.join('');
const bytesToArray = bytes => '{ ' + (Array.from(bytes)
	.map(b => '0x' + b.toString(16).padStart(2, '0'))
	.join(', ')) + ' }';

// const bin = s => `[${s.match(/(..?)/g).map(pair => '0x' + pair).join(', ')}]`;
const salt = new Uint8Array([0xA8, 0xED, 0xCC, 0xAD, 0xCD, 0x56, 0xBC, 0x72]);
const key = new Uint8Array([0x20, 0xA5, 0x6F, 0x90, 0xE5, 0x6E, 0x34, 0x9D, 0x13, 0x55, 0x6C, 0x75, 0x6F, 0x44, 0x0B, 0xAF, 0x71, 0xF0, 0xC6, 0xC2, 0x92, 0x8E, 0xA5, 0xAD, 0xD8, 0xBD, 0xD6, 0x4C, 0xAD, 0xB9, 0xCD, 0x1D]);
const iv = new Uint8Array([0x72, 0x81, 0x79, 0xFC, 0xF9, 0x73, 0x37, 0x83, 0xC2, 0xF4, 0x9E, 0x57, 0x30, 0xCA, 0x49, 0x32]);

fs.readdirSync('.').filter(v => v.endsWith('.h')).forEach(v => fs.rmSync(v));
fs.readdirSync('.').filter(v => v.endsWith('.lua')).forEach(async v => {
	v = v.substring(0, v.length - 4);
	const unencrypted = fs.readFileSync(`${v}.lua`, { encoding: 'utf-8' }).toString('utf-8')
		.split('\\n').join('\\\\n')
		.split('\n')
		.map(v => v.trim())
		.filter(v => v.length > 0 && !v.startsWith('--'))
		.join('\n')
		.replace(/\{\n/g, '{ ').replace(/,\n/g, ', ').replace(/\n\}/g, ' }')
		// .replace(/"/g, '\\"').replace(/\\'/g, '\\\\\'')
		// .split('\n')
		// .join('\\n');
		
	let encrypted = await aes.encrypt(new TextEncoder().encode(unencrypted), key, {
		name: 'AES-CBC',
		iv
	});
	const size = encrypted.byteLength;
	encrypted = bytesToString(encrypted);

	await fs.writeFileSync(`${v}.h`, `#pragma once
const char* script_${v} = "${encrypted}";
const unsigned long int script_${v}_len = ${size};
`);
});

fs.writeFileSync('Key.h', `#pragma once
namespace AES {
	const unsigned char salt[] = ${bytesToArray(salt)};
	const unsigned long int salt_size = ${salt.byteLength};
	const unsigned char key[] = ${bytesToArray(key)};
	const unsigned long int key_size = ${key.byteLength};
	const unsigned char iv[16] = ${bytesToArray(iv)};
}`);