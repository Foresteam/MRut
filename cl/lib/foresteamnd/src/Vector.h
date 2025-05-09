#pragma once
#include <cmath>
#include <sstream>
#include <string>

class Vector {
public:
	float x, y, z;
	Vector(float x, float y, float z);
	Vector(float coords);
	Vector(const Vector& other);
	Vector& operator=(const Vector& other);
	Vector();

	bool operator<(const Vector& v) const;
	bool operator>(const Vector& v) const;
	Vector operator+(const Vector& other) const;
	Vector operator-(const Vector& other) const;
	Vector& operator-=(const Vector& other);
	Vector& operator+=(const Vector& other);
	float operator*(const Vector& other) const;
	Vector operator/(const float& n) const;
	Vector operator*(const float& n) const;
	Vector& operator*=(const float& n);
	Vector& operator/=(const float& n);
	bool operator==(const Vector& other) const;

	/// For rendering.
	Vector WrapScreen();

	/// @param other Other Vector
	/// @returns The cross product of the vector and other
	Vector Cross(const Vector& other) const;

	/// @param other Other Vector
	/// @returns The dot product of the vector and other
	float Dot(const Vector& other) const;

	/// @param other Vector to calculate distance to
	/// @returns The distance between the vector and other
	float Distance(const Vector& other) const;

	float Length() const;

	/// @returns Vector with length of 1
	Vector Normalized() const;

	Vector Angle() const;

	/// @returns Vector3D(x, y, z)
	std::string virtual ToString() const;
};

Vector operator*(const float& n, const Vector& vec);