#include "Vector.h"
#include "Utils.h"
using namespace std;

Vector::Vector(float x, float y, float z) {
	this->x = x;
	this->y = y;
	this->z = z;
}
Vector::Vector(float coords) : Vector(coords, coords, coords) {}
Vector::Vector(const Vector& other) : Vector(other.x, other.y, other.z) {}
Vector::Vector() : Vector::Vector(0, 0, 0) {}
Vector& Vector::operator=(const Vector& other) {
	x = other.x;
	y = other.y;
	z = other.z;
	return *this;
}

bool Vector::operator<(const Vector& v) const {
	if (std::min(std::min(x, y), z) < std::min(std::min(v.x, v.y), v.z))
		return true;
	else if (std::min(std::min(v.x, v.y), v.z) < std::min(std::min(x, y), z))
		return false;
	else
		return std::max(std::max(x, y), z) < std::max(std::max(v.x, v.y), v.z);
	// return this->x < v.x && this->y < v.y && this->z < v.z;
}
bool Vector::operator>(const Vector& v) const {
	return !(*this < v);
}
Vector Vector::operator+(const Vector& other) const {
	return Vector(x + other.x, y + other.y, z + other.z);
}
Vector Vector::operator-(const Vector& other) const {
	return Vector(x - other.x, y - other.y, z - other.z);
}
Vector& Vector::operator-=(const Vector& other) {
	*this = *this - other;
	return *this;
}
Vector& Vector::operator+=(const Vector& other) {
	return *this = *this + other;
}
float Vector::operator*(const Vector& other) const {
	return this->Dot(other);
}
Vector Vector::operator/(const float& n) const {
	return Vector(x / n, y / n, z / n);
}
Vector Vector::operator*(const float& n) const {
	return Vector(x * n, y * n, z * n);
}
Vector& Vector::operator*=(const float& n) {
	return *this = *this * n;
}
Vector& Vector::operator/=(const float& n) {
	return *this = *this / n;
}
bool Vector::operator==(const Vector& other) const {
	return x == other.x && y == other.y && z == other.z;
}

Vector Vector::Cross(const Vector& other) const {
	Vector out = Vector();
	out.x = y * other.z - z * other.y;
	out.y = z * other.x - x * other.z;
	out.z = x * other.y - y * other.x;
	return out;
}
float Vector::Dot(const Vector& other) const {
	float prod = 0;
	prod += x * other.x;
	prod += y * other.y;
	prod += z * other.z;
	return prod;
}
float Vector::Distance(const Vector& other) const {
	return (float)sqrt(pow(x - other.x, 2) + pow(y - other.y, 2) + pow(z - other.z, 2));
}
float Vector::Length() const {
	return Distance(Vector(0, 0, 0));
}
Vector Vector::Normalized() const {
	return *this / Length();
}
Vector Vector::Angle() const {
	Vector out = Vector();
	out.x = atan2(y, x);
	out.y = atan2(x, z);
	return out;
}
string Vector::ToString() const {
	return "Vector3D" + Utils::WrappedInBrackets(3, x, y, z);
}

Vector operator*(const float& n, const Vector& vec) {
	return vec * n;
}