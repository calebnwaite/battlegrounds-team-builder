import js from '@eslint/js';
export default [ {ignores:['.tools/**','node_modules/**','public/catalog.json','test-results/**']}, js.configs.recommended, {languageOptions:{ecmaVersion:2022,sourceType:'module',globals:Object.fromEntries(['document','window','fetch','console','URL','process','Buffer','Response'].map(k=>[k,'readonly']))}} ];
