module.exports = {
	root: true,
	'env': {
		'browser': true,
		'node': false
	},
	'extends': [
		/** @see https://eslint.vuejs.org/rules/ */
		'plugin:vue/vue3-recommended'
	],
	'parserOptions': {
		'parser': '@typescript-eslint/parser',
		'ecmaVersion': 12,
		'sourceType': 'module'
	},
	'rules': {
		/** These rules are disabled because they are incompatible with prettier */
		'vue/html-self-closing': 'off',
		'vue/singleline-html-element-content-newline': 'off',

		quotes: ['error', 'single', { avoidEscape: true }],
		indent: ['error', 'tab'],
		'linebreak-style': ['error', 'unix'],
		semi: ['error', 'always'],
		'dot-notation': ['error'],
		'object-curly-spacing': ['error', 'always', { objectsInObjects: true, arraysInObjects: true }],
		'comma-spacing': ['error', { before: false, after: true }],
		'brace-style': ['error', 'stroustrup']
	}
};
