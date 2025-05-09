#include "Vector2.h"
#include "Utils.h"
using namespace std;

Vector2::Vector2(float x, float y) : Vector::Vector(x, y, 0) {}
Vector2::Vector2(float coords) : Vector2::Vector2(coords, coords) {}
Vector2::Vector2(const Vector& other) : Vector2::Vector2(other.x, other.y) {}
Vector2::Vector2() : Vector2::Vector2(0, 0) {}

string Vector2::ToString() const {
	return "Vector2D" + Utils::WrappedInBrackets(2, x, y);
}