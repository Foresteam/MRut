#pragma once
#include "Vector.h"

class Quaternion : public Vector {
public:
    float w;
    /// @param axis Axis to rotate around
    /// @param angle Angle in radians
    Quaternion(const Vector& axis, float angle);
    Quaternion(float x, float y, float z, float w);
    Quaternion(const Quaternion& other);
    Quaternion();
    Quaternion& operator=(const Quaternion& other);

    float Length() const;
    Quaternion Normalized() const;
    Quaternion Inverted() const;

    // Transforms vector
    void Transform(Vector& vector);

    Quaternion operator*(const float& val) const;
    Quaternion operator/(const float& val) const;
    
    /// Summs Quaternions
    Quaternion operator*(const Quaternion& other) const;

    std::string ToString() const;

    static Quaternion FromVector(const Vector& vector);
};

/// Rotates Vector v using Quaternion q
/// @returns Rotated Vector
Vector operator*(const Quaternion& q, const Vector& v);
/// Rotates Vector v using Quaternion q
/// @returns Rotated Vector
Vector operator*(const Vector& v, const Quaternion& q);

Vector& operator*=(Vector& v, const Quaternion& q);
Vector& operator*=(Quaternion& q0, const Quaternion& q);