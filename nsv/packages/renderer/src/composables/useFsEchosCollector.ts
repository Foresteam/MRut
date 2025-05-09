export default () => {
	const rs: Record<string, { path: string; results: string[] }[]> = {};
	return {
		collect: (filePath: string) => (aResult: Record<string, string[]>) =>
			Object.entries(aResult)
				.forEach(([clientId, commandResults]) =>
					(rs[clientId] ||= []).push({ path: filePath, results: commandResults })
				),
		commit: () => {
			return {
				failed: Object.entries(rs)
					.map(
						([sId, resultsByFile]) =>
							[+sId, resultsByFile.filter(rs => rs.results.some(rs => rs == 'false')).map(rs => rs.path)] as const
					)
					.filter(([_, failedPaths]) => failedPaths.length),
				rs
			};
		}
	};
};