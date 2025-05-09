#include "Quaternion.h"
#include "Utils.h"
#include <cmath>
using namespace std;

Quaternion::Quaternion(const Vector& axis, float angle) : Vector(axis.Normalized() * sin(angle / 2)) {
    w = cos(angle / 2);
}
Quaternion Quaternion::FromVector(const Vector& vector) {
	return Quaternion(vector.x, vector.y, vector.z, 0);
}
Quaternion::Quaternion(float x, float y, float z, float w) : Vector(x, y, z) {
    this->w = w;
}
Quaternion::Quaternion() : Quaternion(0, 0, 0, 1) {}

string Quaternion::ToString() const {
    return "Quaternion" + Utils::WrappedInBrackets(4, x, y, z, w);
}

float Quaternion::Length() const {
	return sqrt(sqr(x) + sqr(y) + sqr(z) + sqr(w));
}
Quaternion Quaternion::Normalized() const {
    return *this / Length();
}
Quaternion Quaternion::Inverted() const {
    return Quaternion(-x, -y, -z, w).Normalized();
}

void Quaternion::Transform(Vector& vector) {
    vector = vector * *this;
}

Quaternion Quaternion::operator*(const float& val) const {
    return Quaternion(x * val, y * val, z * val, w * val);
}
Quaternion Quaternion::operator/(const float& val) const {
	return *this * (1 / val);
}

Quaternion Quaternion::operator*(const Quaternion& other) const {
    return Quaternion(
        w * other.x + x * other.w + y * other.z - z * other.y,
        w * other.y - x * other.z + y * other.w + z * other.x,
        w * other.z + x * other.y - y * other.x + z * other.w,
        w * other.w - x * other.x - y * other.y - z * other.z
    );
}

Quaternion& Quaternion::operator=(const Quaternion& other) {
    x = other.x;
    y = other.y;
    z = other.z;
    w = other.w;
    return *this;
}
Quaternion::Quaternion(const Quaternion& other) {
	x = other.x;
	y = other.y;
	z = other.z;
	w = other.w;
}

Vector operator*(const Quaternion& q, const Vector& v) {
	Quaternion r = q * Quaternion::FromVector(v) * q.Inverted();
    return Vector(r.x, r.y, r.z);
}
Vector operator*(const Vector& v, const Quaternion& q) {
    return q * v;
}

Vector& operator*=(Vector& v, const Quaternion& q) {
    return v = v * q;
}
Vector& operator*=(Quaternion& q0, const Quaternion& q) {
    return q0 = q0 * q;
}