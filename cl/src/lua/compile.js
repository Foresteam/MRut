import fs from 'fs';
import aes from 'js-crypto-aes';
import { randomBytes } from 'node:crypto';

const bytesToString = bytes => Array.from(bytes)
	.map(b => '\\x' + b.toString(16).padStart(2, '0'))
	.join('');
const bytesToArray = bytes => '{ ' + (Array.from(bytes)
	.map(b => '0x' + b.toString(16).padStart(2, '0'))
	.join(', ')) + ' }';

// const bin = s => `[${s.match(/(..?)/g).map(pair => '0x' + pair).join(', ')}]`;
const salt = randomBytes(8);
const key = randomBytes(32);
const iv = randomBytes(16);

const encrypt = data => aes.encrypt(new TextEncoder().encode(data), key, {
	name: 'AES-CBC',
	iv
});
const writeEncrypted = (name, encrypted, prefix = 'script_') => {
	const size = encrypted.byteLength;
	encrypted = bytesToString(encrypted);

	fs.writeFileSync(
		`${name}.h`,
		`#pragma once
const char* ${prefix}${name} = "${encrypted}";
const unsigned long int ${prefix}${name}_len = ${size};`
	);
}

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
		
	writeEncrypted(v, await encrypt(unencrypted));
});

if (fs.existsSync('root.crt'))
	writeEncrypted('rootCertificate', await encrypt(fs.readFileSync('root.crt')), '');

fs.writeFileSync('Key.h', `#pragma once
namespace AES {
	const unsigned char salt[] = ${bytesToArray(salt)};
	const unsigned long int salt_size = ${salt.byteLength};
	const unsigned char key[] = ${bytesToArray(key)};
	const unsigned long int key_size = ${key.byteLength};
	const unsigned char iv[16] = ${bytesToArray(iv)};
}`);