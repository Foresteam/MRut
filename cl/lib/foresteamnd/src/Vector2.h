#pragma once
#include "Vector.h"

class Vector2 : public Vector {
public:
	Vector2(float x, float y);
	Vector2(float coords);
	Vector2(const Vector& other);
	Vector2();

	/// @returns Vector2D(x, y)
	std::string ToString() const override;
};