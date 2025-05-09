#include "Triangle.h"

Triangle::Triangle(Vector a, Vector b, Vector c) {
	_points[0] = a;
	_points[1] = b;
	_points[2] = c;
}
void Triangle::CalcVerteces(Vector* base) {
	this->base = base;
	for (int i = 0; i < 3; i++)
		verteces[i] = _points[i] - *base;
}

Vector Triangle::GetPoint(int n) {
	return verteces[n] + *base;
}

float Triangle::sign(Vector2 p1, Vector2 p2, Vector2 p3) {
	return (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
}

bool Triangle::PlaneContains(Vector2 point) {
	float d1, d2, d3;
	bool has_neg, has_pos;

	d1 = sign(point, GetPoint(0), GetPoint(1));
	d2 = sign(point, GetPoint(1), GetPoint(2));
	d3 = sign(point, GetPoint(2), GetPoint(0));

	has_neg = d1 < 0 || d2 < 0 || d3 < 0;
	has_pos = d1 > 0 || d2 > 0 || d3 > 0;

	return !(has_neg && has_pos);
}
Vector Triangle::PlaneNormal() {
    return (GetPoint(1) - GetPoint(0)).Cross(GetPoint(2) - GetPoint(0)).Normalized();
}
Vector Triangle::PlanePointProjection(Vector point) {
    Vector n = PlaneNormal();
    return point - n * (point - GetPoint(0)).Dot(n);
}

Vector* Triangle::GetPoints() {
	return new Vector[3] { GetPoint(0), GetPoint(1), GetPoint(2) };
}
void Triangle::Rotate(Quaternion rotation) {
	for (int i = 0; i < 3; i++)
		verteces[i] *= rotation;
	this->rotation *= rotation;
}