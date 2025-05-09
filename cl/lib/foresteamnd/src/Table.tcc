#pragma once
#include "Table.h"
#include "Utils.h"
#include <cstring>

#define TTABLE template<typename T>

TTABLE Table<T>::Table(size_t s1, size_t s2) {
    this->s1 = s1;
    this->s2 = s2;
    _self = new T[s1 * s2];
    self = new T*[s2];
    for (size_t i = 0; i < s2; i++)
        self[i] = _self + s1 * i;
}
TTABLE Table<T>::Table(const Table& other) : Table(other.s1, other.s2) {
    memcpy(_self, other._self, s1 * s2);
}

TTABLE Table<T> Table<T>::operator=(const Table& other) {
    return Table<T>(other);
}

TTABLE Table<T>::~Table() {
    delete[] _self;
    delete[] self;
}

TTABLE T* Table<T>::At(size_t index) {
    return self[index];
}
TTABLE T* Table<T>::operator[](size_t index) {
    return At(index);
}
TTABLE T* Table<T>::operator*() {
    return At(0);
}

TTABLE size_t Table<T>::SizeHigh() {
    return s2;
}
TTABLE size_t Table<T>::SizeLow() {
    return s1;
}
TTABLE size_t Table<T>::Size() {
    return SizeHigh();
}

TTABLE std::string Table<T>::ToString() {
    std::string result;
    for (int i = 0; i < SizeHigh(); i++) {
        for (int j = 0; j < SizeLow(); j++) {
            result += Utils::String::Convert(At(i)[j]);
            if (j != SizeLow() - 1)
                result += '\t';
        }
        if (i != SizeHigh() - 1)
            result += '\n';
    }
    return result;
}