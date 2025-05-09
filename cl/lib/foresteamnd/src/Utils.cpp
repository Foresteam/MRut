#include "Utils.h"
#include <algorithm>
#include <cctype>
#include <cmath>
#include <cstdarg>
#include <fstream>
#include <sstream>
using namespace std;

float Utils::RandRange(float from, float to) {
	return ((float)rand() / (float)RAND_MAX) * (to - from) + from;
}
float Utils::RandRange(float to) {
	return RandRange(0, to);
}

float Utils::RoundTo(float val, int k) {
	val *= (float)pow(10, k);
	val = round(val);
	val /= (float)pow(10, k);

	if (fabs(val) == 0)
		val = 0;

	return val;
}

string Utils::WrappedInBrackets(int count...) {
	va_list args;
	va_start(args, count);

	stringstream ss;
	ss << "(";
	for (int i = 0; i < count; i++) {
		ss << (float)va_arg(args, double);
		if (i != count - 1)
			ss << ", ";
	}
	ss << ")";

	va_end(args);
	return string(istreambuf_iterator<char>(ss), {});
}

string Utils::String::AlignedLeft(string s, size_t maxLength) {
	s = Trimmed(s);
	while (s.length() < maxLength)
		s.insert(s.rbegin().base(), ' ');
	return s;
}
string Utils::String::AlignedRight(string s, size_t maxLength) {
	s = Trimmed(s);
	while (s.length() < maxLength)
		s.insert(s.begin(), ' ');
	return s;
}
string Utils::String::AlignedCenter(string s, size_t maxLength) {
	s = Trimmed(s);
	while (s.length() < maxLength) {
		s.insert(s.begin(), ' ');
		s.insert(s.rbegin().base(), ' ');
	}
	if (s.length() > maxLength)
		s.erase(s.rend().base());
	return s;
}

string Utils::String::TrimmedLeft(string s) {
	int spos = 0;
	for (int i = 0; i < s.length() && s[i] == ' '; i++, spos++);
	return s.substr(spos);
}
string Utils::String::TrimmedRight(string s) {
	size_t spos = 0;
	for (size_t i = s.length(); i > 0 && s[i - 1] == ' '; i--, spos++);
	return s.substr(0, s.length() - spos);
}
string Utils::String::Trimmed(string s) {
	return TrimmedRight(TrimmedLeft(s));
}

string Utils::String::ReplaceAll(string s, string what, string with) {
	size_t pos;
	do {
		pos = s.find(what);
		if (pos >= 0)
			s = s.replace(pos, what.length(), with);
	}
	while (pos >= 0);
	return s;
}
string Utils::String::ToLower(string s) {
	transform(s.begin(), s.end(), s.begin(), [](unsigned char c) { return tolower(c); });
	return s;
}

string Utils::Net::ParseHostStr(uint32_t host, uint16_t port) {
	char* hostBytes = reinterpret_cast<char*>(&host);
	return std::to_string(int(hostBytes[0])) + '.' +
		   std::to_string(int(hostBytes[1])) + '.' +
		   std::to_string(int(hostBytes[2])) + '.' +
		   std::to_string(int(hostBytes[3])) + ':' +
		   std::to_string(port);
}


std::list<std::string> Utils::ReadAllFile(std::string name) {
	auto result = std::list<std::string>();
	std::ifstream input;
	input.open(name);
	for (std::string line = ""; getline(input, line);)
		result.push_back(line);
	return result;
}

std::list<std::string> Utils::String::Split(std::string s, std::string delimiter) {
	std::list<std::string> result = std::list<std::string>();
	size_t pos;
	while ((pos = s.find(delimiter)) != std::string::npos) {
		std::string found = s.substr(0, pos);
		// if (found.length() > 0)
			result.push_back(s.substr(0, pos));
		s = s.substr(pos + 1);
	}
	if (s.length() > 0)
		result.push_back(s);
	return result;
}

template <typename V>
std::string Utils::String::Join(std::list<V> items, std::string glue) {
    std::stringstream ss;
    int i = 0;
    for (V item : items) {
        ss << item;
        if (i != items.size() - 1)
            ss << glue;
        i++;
    }
    return std::string(std::istreambuf_iterator<char>(ss), {});
}
template std::string Utils::String::Join<std::string>(std::list<std::string>, std::string);
template std::string Utils::String::Join<int>(std::list<int>, std::string);
template std::string Utils::String::Join<long int>(std::list<long int>, std::string);
template std::string Utils::String::Join<size_t>(std::list<size_t>, std::string);
template std::string Utils::String::Join<float>(std::list<float>, std::string);
template std::string Utils::String::Join<double>(std::list<double>, std::string);

template <typename T>
std::string Utils::String::Convert(T value) {
	std::string rs;

	std::stringstream ss;
	ss << value;
	ss >> rs;

	return rs;
}
template std::string Utils::String::Convert<int>(int);
template std::string Utils::String::Convert<unsigned short>(unsigned short);
template std::string Utils::String::Convert<long int>(long int);
template std::string Utils::String::Convert<size_t>(size_t);
template std::string Utils::String::Convert<float>(float);
template std::string Utils::String::Convert<double>(double);

template<typename T>
T Utils::String::Convert(std::string value) {
    T rs;
    std::stringstream ss;
    ss << value;
    ss >> rs;
    return rs;
}
template int Utils::String::Convert<int>(std::string);
template long int Utils::String::Convert<long int>(std::string);
template size_t Utils::String::Convert<size_t>(std::string);
template float Utils::String::Convert<float>(std::string);
template double Utils::String::Convert<double>(std::string);

inline int Utils::String::Regex::CountMatches(std::string s, std::regex expr) {
	auto wordsBegin = std::sregex_iterator(s.begin(), s.end(), expr);
	auto wordsEnd = std::sregex_iterator();

	return std::distance(wordsBegin, wordsEnd);
}
std::list<std::smatch> Utils::String::Regex::FindAllMatches(std::string s, std::regex expr) {
	std::list<std::smatch> result = std::list<std::smatch>();
	std::smatch sm;
	while (std::regex_search(s, sm, expr)) {
		result.push_back(sm);
		s = sm.suffix();
	}
	return result;
}
inline std::set<std::string> Utils::String::Regex::FindAllMatchesOnce(std::string s, std::regex expr) {
	std::set<std::string> result = std::set<std::string>();
	for (auto match : FindAllMatches(s, expr))
		result.emplace(match.str());
	return result;
}